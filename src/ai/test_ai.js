const { spawn } = require('child_process');
const path = require('path');

function verifyMatch(nameA, nameB) {
    return new Promise((resolve, reject) => {
        const pythonPath = 'py';
        const scriptPath = path.join(__dirname, 'identity_matcher.py');
        console.log(`Executing: ${pythonPath} ${scriptPath}`);

        const pythonProcess = spawn(pythonPath, [scriptPath]);

        let resultData = '';
        let errorData = '';

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
                console.error(`AI Error [Code ${code}]: ${errorData}`);
                reject(errorData);
            } else {
                try {
                    resolve(JSON.parse(resultData));
                } catch (e) {
                    console.error('Failed to parse result:', resultData);
                    reject(e);
                }
            }
        });
    });
}

console.log('--- TESTING IDENTITY AI MATCHING ---');
// Test Case 1: Matching names in different order
verifyMatch('John Doe', 'DOE JOHN').then(res => {
    console.log('Test 1 (Order Swap):', res);

    // Test Case 2: Mismatching names
    return verifyMatch('John Doe', 'Jane Smith');
}).then(res => {
    console.log('Test 2 (Mismatch):', res);

    // Test Case 3: Partial match (Middle name)
    return verifyMatch('John Quincy Adams', 'John Adams');
}).then(res => {
    console.log('Test 3 (Partial):', res);
    process.exit(0);
}).catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});
