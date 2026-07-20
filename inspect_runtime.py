import os
import re

def find_ts_files(dirs):
    for d in dirs:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.ts') or file.endswith('.tsx'):
                    yield os.path.join(root, file)

def analyze_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # 1. Zod SafeParse Usage Check
    for i, line in enumerate(lines):
        if '.safeParse(' in line:
            # check if it is checked
            checked = False
            # Check next 15 lines for .success or .error
            for j in range(i, min(i+15, len(lines))):
                if '.success' in lines[j] or '.error' in lines[j] or 'parsed.data' in lines[j] or 'parsed' not in line:
                    checked = True
                    break
            if not checked:
                print(f"[ZOD IGNORED] {filepath}:{i+1} -> {line.strip()}")
                
        if '.parse(' in line and 'JSON.parse' not in line:
            # parse throws, so that's fine, but let's check if it's used safely
            pass

    # 2. Auth Bypasses
    for i, line in enumerate(lines):
        if 'process.env.NODE_ENV' in line or 'process.env.CI' in line or 'bypassAuth' in line or '__mock__' in line:
            # Exclude known test files or config
            if 'test' not in filepath and 'env' not in filepath and 'instrumentation' not in filepath:
                print(f"[AUTH BYPASS] {filepath}:{i+1} -> {line.strip()}")
                
    # 3. Tautological comparisons
    for i, line in enumerate(lines):
        # find === or !==
        match = re.search(r'(\b[a-zA-Z0-9_.]+\b)\s*(?:===|!==|==|!=)\s*(\b[a-zA-Z0-9_.]+\b)', line)
        if match:
            left = match.group(1)
            right = match.group(2)
            if left == right and left not in ['true', 'false', 'null', 'undefined']:
                if 'eslint' not in line:
                    print(f"[TAUTOLOGY] {filepath}:{i+1} -> {line.strip()}")

for f in find_ts_files(['features', 'app/api', 'shared']):
    analyze_file(f)
