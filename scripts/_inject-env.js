// Reads a secret value from stdin and replaces a target line in .env.local.
// Used by the `gcp-api-key-secure-create` flow so the secret never touches
// a shell variable, terminal output, or chat — only flows pipe → stdin → file.
//
// Usage:
//   gcloud ... --format="value(keyString)" | node scripts/_inject-env.js GOOGLE_GENAI_API_KEY
const fs = require('fs');
const path = require('path');

const targetVar = process.argv[2];
if (!targetVar) {
  console.error('Usage: node _inject-env.js <ENV_VAR_NAME>');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), '.env.local');

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { buffer += d; });
process.stdin.on('end', () => {
  const value = buffer.trim();
  if (!value) {
    console.error('Empty stdin — refusing to write empty value.');
    process.exit(2);
  }

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const lineRegex = new RegExp(`^${targetVar}=.*$`, 'm');
  const newLine = `${targetVar}=${value}`;

  if (lineRegex.test(envContent)) {
    envContent = envContent.replace(lineRegex, newLine);
  } else {
    if (envContent.length && !envContent.endsWith('\n')) envContent += '\n';
    envContent += newLine + '\n';
  }

  fs.writeFileSync(envPath, envContent, { encoding: 'utf8', mode: 0o600 });
  console.log(`✅ ${targetVar} written to .env.local (length=${value.length})`);
});
