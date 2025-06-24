#!/bin/bash

set -e

PYTHON_PROJECT_DIR="$(dirname "$0")"

VENV_DIR="${PYTHON_PROJECT_DIR}/venv"
REQUIREMENTS_FILE="${PYTHON_PROJECT_DIR}/requirements.txt"

echo "--- Python Dependency Installation Script ---"
echo "Python Project Directory: ${PYTHON_PROJECT_DIR}"
echo "Virtual Environment Directory: ${VENV_DIR}"
echo "Requirements File: ${REQUIREMENTS_FILE}"

# 1. Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "Error: python3 could not be found. Please install Python 3."
    exit 1
fi

# 2. Create virtual environment if it doesn't exist
if [ ! -d "${VENV_DIR}" ]; then
    echo "Creating virtual environment at ${VENV_DIR}..."
    python3 -m venv "${VENV_DIR}"
else
    echo "Virtual environment already exists at ${VENV_DIR}."
fi

# 3. Determine the pip executable path within the venv
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows
    PIP_EXECUTABLE="${VENV_DIR}/Scripts/pip.exe"
else
    # macOS/Linux
    PIP_EXECUTABLE="${VENV_DIR}/bin/pip"
fi

# 4. Install dependencies from requirements.txt
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo "Installing dependencies from ${REQUIREMENTS_FILE}..."
    "${PIP_EXECUTABLE}" install -r "${REQUIREMENTS_FILE}"
    echo "Python dependencies installed successfully."
else
    echo "Warning: ${REQUIREMENTS_FILE} not found. Skipping dependency installation."
fi

echo "--- Script finished ---"