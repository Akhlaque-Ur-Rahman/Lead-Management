const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('npm.cmd', ['run', 'build'], { shell: true });

const logStream = fs.createWriteStream('clean_build_log.txt');

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
  logStream.end();
});
