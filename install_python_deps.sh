#!/bin/bash

set -e


PYTHON_PROJECT_DIR="." 
VENV_DIR="<span class="math-inline">\{PYTHON\_PROJECT\_DIR\}/venv"
REQUIREMENTS\_FILE\="</span>{PYTHON_PROJECT_DIR}/requirements.txt"

echo "--- Python Dependency Installation Script ---"
echo "Python Project Directory: ${PYTHON_PROJECT_DIR}"
echo "Virtual Environment Directory: ${VENV_DIR}"
echo "Requirements File: <span class="math-inline">\{REQUIREMENTS\_FILE\}"
\# 1\. Check if Python is installed
if \! command \-v python3 &\> /dev/null
then
echo "Error\: python3 could not be found\. Please install Python 3\."
exit 1
fi
\# 2\. Create virtual environment if it doesn't exist
if \[ \! \-d "</span>{VENV_DIR}" ]; then
    echo "Creating virtual environment at <span class="math-inline">\{VENV\_DIR\}\.\.\."
python3 \-m venv "</span>{VENV_DIR}"
else
    echo "Virtual environment already exists at ${VENV_DIR}."
fi

# 3. Activate the virtual environment
# We don't actually need to "activate" it in the traditional shell sense
# because we'll execute pip using the full path to its executable within the venv.

# Determine the pip executable path within the venv
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "<span class="math-inline">OSTYPE" \=\= "win32" \]\]; then
\# Windows
PIP\_EXECUTABLE\="</span>{VENV_DIR}/Scripts/pip.exe"
else
    # macOS/Linux
    PIP_EXECUTABLE="<span class="math-inline">\{VENV\_DIR\}/bin/pip"
fi
\# 4\. Install dependencies from requirements\.txt
if \[ \-f "</span>{REQUIREMENTS_FILE}" ]; then
    echo "Installing dependencies from <span class="math-inline">\{REQUIREMENTS\_FILE\}\.\.\."
"</span>{PIP_EXECUTABLE}" install -r "${REQUIREMENTS_FILE}"
    echo "Python dependencies installed successfully."
else
    echo "Warning: ${REQUIREMENTS_FILE} not found. Skipping dependency installation."
fi

echo "--- Script finished ---"