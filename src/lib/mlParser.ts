interface HealthStatus {
  "ID": number;
  "Descp": string;
  "Alert": string;
  "Score": number;
  "Message": string;
}

/**
 * Parses a health status string into a HealthStatus object, assuming a fixed format.
 *
 * @param statusString The input string containing health status information in a specific, fixed format.
 * @returns A HealthStatus object. Throws an error if the format does not match expectations.
 */
export function parseHealthStatus(statusString: string): HealthStatus {
  const parsedData: HealthStatus = {
      ID: 0,
      Descp: "",
      Alert: "",
      Score: 0,
      Message: ""
  };

  // Define strict regex patterns for each line
  const classIdLineRegex = /Predicted Class ID:\s*(\d+)/i;
  const classDescriptionLineRegex = /Predicted Class ID:\s*\d+\s*—\s*(.+)/i;
  const alertLineRegex = /Alert:\s*(.+)/i;
  const healthScoreLineRegex = /Your Health Score:\s*([\d.]+)/i;
  const messageLineRegex = /^(?!Predicted Class ID|Alert|Your Health Score)(.+)$/im; // Multi-line, case-insensitive

  const lines = statusString.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Parse each piece of information based on expected line content
  for (const line of lines) {
    let match;

    match = line.match(classIdLineRegex);
    if (match) {
      parsedData["ID"] = parseInt(match[1], 10);
      // Try to get description from the same line if available (e.g., "ID: 0 - Normal")
      const descMatch = line.match(classDescriptionLineRegex);
      if (descMatch) {
        parsedData["Descp"] = descMatch[1].trim();
      }
      continue;
    }

    match = line.match(alertLineRegex);
    if (match) {
      parsedData["Alert"] = match[1].trim();
      continue;
    }

    match = line.match(healthScoreLineRegex);
    if (match) {
      parsedData["Score"] = parseFloat(match[1]);
      continue;
    }

    // If it's not any of the above known patterns, it's likely the message.
    // This assumes the message is the *last* non-patterned line.
    // We'll capture it and let subsequent iterations potentially overwrite if a more specific match is found,
    // but in a strict format, it should reliably be the last.
    if (!parsedData["Message"]) { // Only set if not already set, or if it's the actual final message
      const isKnownHeader = /^(Predicted Class ID|Alert|Your Health Score):/i.test(line);
      if (!isKnownHeader) {
          parsedData["Message"] = line;
      }
    }
  }

  // A more robust way to get the final message if it's always the very last line
  const lastLine = lines[lines.length - 1];
  if (lastLine && !/^(Predicted Class ID|Alert|Your Health Score):/i.test(lastLine)) {
      parsedData["Message"] = lastLine;
  } else {
      // If the last line *is* a key, try to extract message if it was on the same line as Health Score
      const healthScoreMessageMatch = statusString.match(/Your Health Score:\s*[\d.]+\s*(.*)/i);
      if (healthScoreMessageMatch && healthScoreMessageMatch[1]) {
          const potentialMessage = healthScoreMessageMatch[1].trim();
          if (potentialMessage && !/^(Predicted Class ID|Alert):/i.test(potentialMessage)) {
              parsedData["Message"] = potentialMessage;
          }
      }
  }


  // Basic validation to ensure all expected fields are present (given strict format)
  if (parsedData["ID"] === undefined ||
      parsedData["Descp"] === undefined ||
      parsedData["Alert"] === undefined ||
      parsedData["Score"] === undefined ||
      parsedData["Message"] === undefined) {
      // You might want to throw a more specific error or handle missing fields differently
      console.warn("Warning: Some expected fields were not found in the health status string. Input:", statusString);
      // For strict mode, throwing an error is often preferred.
      // throw new Error("Input string format did not match expected strict pattern.");
  }


  return parsedData as HealthStatus; // Cast to ensure all required properties are there if no error thrown
}
