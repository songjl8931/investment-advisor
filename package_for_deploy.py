import zipfile
import os

def package_project():
    output_filename = "deploy_package.zip"
    
    # Files and folders to include
    include_files = [
        "server.py",
        "requirements.txt",
        "start_server.sh",
        "user_models.json",
        "metadata.json"
    ]
    
    include_dirs = [
        "app",
        "dist"
    ]
    
    # Exclude patterns (simple check)
    exclude_patterns = [
        "__pycache__",
        ".DS_Store",
        ".git"
    ]

    print(f"Creating {output_filename}...")
    
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add individual files
        for file in include_files:
            if os.path.exists(file):
                print(f"Adding {file}...")
                zipf.write(file)
            else:
                print(f"Warning: {file} not found!")

        # Add directories
        for directory in include_dirs:
            if os.path.exists(directory):
                print(f"Adding directory {directory}...")
                for root, dirs, files in os.walk(directory):
                    # Filter out excluded directories
                    dirs[:] = [d for d in dirs if d not in exclude_patterns]
                    
                    for file in files:
                        if file in exclude_patterns or file.endswith('.pyc'):
                            continue
                            
                        file_path = os.path.join(root, file)
                        # Keep the directory structure
                        zipf.write(file_path)
            else:
                print(f"Warning: Directory {directory} not found!")
                
    print("Packaging complete!")

if __name__ == "__main__":
    package_project()
