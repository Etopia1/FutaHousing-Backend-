import { spawn } from 'child_process';
import path from 'path';

export class IdentityAIService {
    /**
     * Calls the Python Identity AI to verify if two names match.
     * @param nameA Name from registration
     * @param nameB Name from bank record
     */
    static async verifyMatch(nameA: string, nameB: string): Promise<{ passed: boolean; score: number; message: string; similarity_percent: string }> {
        return new Promise((resolve, reject) => {
            const pythonPath = 'py'; // Windows Python Launcher
            const scriptPath = path.join(__dirname, 'identity_matcher.py');

            const pythonProcess = spawn(pythonPath, [scriptPath]);

            let resultData = '';
            let errorData = '';

            // Send data via stdin
            pythonProcess.stdin.write(JSON.stringify({ name_a: nameA, name_b: nameB }));
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (data) => {
                resultData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[AI Service] Python process exited with code ${code}. Error: ${errorData}`);
                    return reject(new Error('AI Verification Process Failed'));
                }
                try {
                    const result = JSON.parse(resultData);
                    resolve(result);
                } catch (e) {
                    console.error(`[AI Service] Failed to parse AI output: ${resultData}`);
                    reject(new Error('Invalid AI response'));
                }
            });
        });
    }
}
