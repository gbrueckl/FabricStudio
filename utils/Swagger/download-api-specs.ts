#!/usr/bin/env node

/**
 * Download Fabric REST API Specs Repository
 * This script downloads the Microsoft Fabric REST API specifications from GitHub
 * 
 * Usage:
 *   npm run download-api-specs
 *   OR
 *   ts-node utils/Swagger/download-api-specs.ts
 * 
 * Configuration:
 *   - REPOSITORY_URL: The GitHub repository URL to clone from
 *   - TARGET_DIRECTORY: The local directory name where specs will be downloaded
 *   - FORCE: Set to true to automatically overwrite existing directories
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

// Configuration
const REPOSITORY_URL = "https://github.com/microsoft/fabric-rest-api-specs";
const TARGET_DIRECTORY = "definition";
const FORCE = process.argv.includes('--force') || false;

// Helper function to remove directory recursively (compatible with older Node.js versions)
function removeDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                removeDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

// Get the directory where this script is located
const scriptDirectory = __dirname;

console.log(`Repository URL: ${REPOSITORY_URL}`);

// Validate the URL
if (!REPOSITORY_URL || !REPOSITORY_URL.match(/^https:\/\/github\.com\//)) {
    console.error(`Invalid repository URL: ${REPOSITORY_URL}`);
    process.exit(1);
}

// Set up target directory
const targetPath = path.join(scriptDirectory, TARGET_DIRECTORY);
console.log(`Target directory: ${targetPath}`);

async function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    try {
        // Check if target directory exists and handle accordingly
        if (fs.existsSync(targetPath)) {
            if (FORCE) {
                console.log("Target directory exists. Removing due to force parameter...");
                removeDirectory(targetPath);
            } else {
                console.warn(`Target directory already exists: ${targetPath}`);
                const response = await promptUser("Do you want to remove it and download fresh? (y/N): ");
                if (response.toLowerCase() === 'y') {
                    removeDirectory(targetPath);
                } else {
                    console.log("Operation cancelled.");
                    process.exit(0);
                }
            }
        }

        // Create target directory
        console.log("Creating target directory...");
        fs.mkdirSync(targetPath, { recursive: true });

        // Clone the repository
        console.log("Cloning repository...");
        
        try {
            execSync(`git clone "${REPOSITORY_URL}" "${targetPath}"`, { 
                stdio: 'inherit',
                cwd: scriptDirectory
            });
            
            console.log(`\x1b[32mRepository cloned successfully to: ${targetPath}\x1b[0m`);
            
            // Show some information about what was downloaded
            const getItemCount = (dir: string): number => {
                let count = 0;
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    count++;
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    if (stat.isDirectory()) {
                        count += getItemCount(itemPath);
                    }
                }
                return count;
            };
            
            const itemCount = getItemCount(targetPath);
            console.log(`\x1b[32mDownloaded ${itemCount} items total\x1b[0m`);
            
            // List top-level directories and files
            console.log("\nTop-level contents:");
            const items = fs.readdirSync(targetPath);
            items.forEach(item => {
                const itemPath = path.join(targetPath, item);
                const stat = fs.statSync(itemPath);
                const type = stat.isDirectory() ? "DIR " : "FILE";
                console.log(`  ${type} ${item}`);
            });
            
        } catch (gitError) {
            console.error(`Git clone failed: ${gitError}`);
            process.exit(1);
        }

        console.log("\n\x1b[32mDownload completed successfully!\x1b[0m");
        
    } catch (error) {
        console.error(`Failed to download repository: ${error}`);
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    console.error(`Unexpected error: ${error}`);
    process.exit(1);
});
