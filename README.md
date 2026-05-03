# career-architect

> a local pipeline that diffs job descriptions against your private yaml profile to compile targeted latex resumes

[![License](https://img.shields.io/github/license/wranngle/career_architect?color=A371F7)](./LICENSE) ![Status](https://img.shields.io/badge/status-experimental-orange.svg)

> [!NOTE]
> Experiment. Built to learn one specific thing. Code may not survive.

## Quick start

```bash
git clone https://github.com/wranngle/career_architect.git
cd career_architect
npm install
npx playwright install chromium
pip install -r requirements.txt
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
npm run doctor
```

## What it does

career-architect runs the mechanical phase of your job search from the terminal. It evaluates incoming job descriptions against your central profile, generates tailored PDF resumes for high-match roles, and updates your application status across tracking portals. You monitor the active pipeline through either a local Next.js web interface or the Go terminal dashboard.

## Usage

Start by invoking the pipeline commands from within your agent workflow.

```bash
# Scan enabled job portals for new listings
/career-ops scan

# Evaluate a specific job posting and generate a tailored resume
/career-ops https://example.com/job

# Start the web dashboard to review your pipeline
npm run dev
```

## License

Available under the [MIT License](./LICENSE).
