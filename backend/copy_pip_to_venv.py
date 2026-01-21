#!/usr/bin/env python3
"""
Script to copy host system's pip-installed libraries to a virtual environment.
This script creates a requirements file from the host system and installs 
those packages in the specified virtual environment.
"""

import subprocess
import sys
import os
import argparse
from pathlib import Path

def run_command(cmd, capture_output=True):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=capture_output, 
            text=True, 
            check=True
        )
        return result.stdout.strip() if capture_output else None
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}")
        print(f"Error output: {e.stderr}")
        sys.exit(1)

def get_host_packages():
    """Get list of packages installed on host system."""
    print("Getting list of packages from host system...")
    output = run_command("pip list --format=freeze")
    
    # Filter out editable installs (lines starting with -e)
    packages = []
    for line in output.split('\n'):
        if line and not line.startswith('-e'):
            packages.append(line)
    
    return packages

def create_requirements_file(packages, filename="host_requirements.txt"):
    """Create a requirements file from the package list."""
    print(f"Creating requirements file: {filename}")
    with open(filename, 'w') as f:
        f.write('\n'.join(packages))
    
    print(f"Created {filename} with {len(packages)} packages")
    return filename

def check_venv_exists(venv_path):
    """Check if virtual environment exists."""
    venv_path = Path(venv_path)
    
    # Check for common venv indicators
    if sys.platform == "win32":
        python_exe = venv_path / "Scripts" / "python.exe"
        pip_exe = venv_path / "Scripts" / "pip.exe"
    else:
        python_exe = venv_path / "bin" / "python"
        pip_exe = venv_path / "bin" / "pip"
    
    return python_exe.exists() and pip_exe.exists()

def install_packages_in_venv(venv_path, requirements_file):
    """Install packages from requirements file into the virtual environment."""
    if not check_venv_exists(venv_path):
        print(f"Error: Virtual environment not found at {venv_path}")
        print("Please create the virtual environment first with:")
        print(f"python -m venv {venv_path}")
        sys.exit(1)
    
    # Determine pip path based on OS
    if sys.platform == "win32":
        pip_path = Path(venv_path) / "Scripts" / "pip"
    else:
        pip_path = Path(venv_path) / "bin" / "pip"
    
    print(f"Installing packages into virtual environment: {venv_path}")
    print("This may take a while...")
    
    # Install packages
    cmd = f'"{pip_path}" install -r {requirements_file}'
    run_command(cmd, capture_output=False)
    
    print("\nInstallation completed!")

def main():
    parser = argparse.ArgumentParser(
        description="Copy host system's pip libraries to a virtual environment"
    )
    parser.add_argument(
        "venv_path", 
        help="Path to the virtual environment directory"
    )
    parser.add_argument(
        "--requirements-file", 
        default="host_requirements.txt",
        help="Name for the requirements file (default: host_requirements.txt)"
    )
    parser.add_argument(
        "--keep-requirements", 
        action="store_true",
        help="Keep the requirements file after installation"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only create requirements file, don't install packages"
    )
    
    args = parser.parse_args()
    
    try:
        # Get packages from host system
        packages = get_host_packages()
        
        if not packages:
            print("No packages found on host system")
            sys.exit(1)
        
        # Create requirements file
        req_file = create_requirements_file(packages, args.requirements_file)
        
        if args.dry_run:
            print(f"\nDry run complete. Requirements file created: {req_file}")
            print("To install these packages in your venv, run:")
            print(f"python {sys.argv[0]} {args.venv_path} --requirements-file {req_file}")
            return
        
        # Install packages in venv
        install_packages_in_venv(args.venv_path, req_file)
        
        # Clean up requirements file unless --keep-requirements is specified
        if not args.keep_requirements:
            os.remove(req_file)
            print(f"Removed temporary file: {req_file}")
        else:
            print(f"Requirements file saved as: {req_file}")
            
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
