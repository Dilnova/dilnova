import os
import re

def get_indent(line):
    return len(line) - len(line.lstrip())

def find_ts_files(dirs):
    for d in dirs:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.ts') or file.endswith('.tsx'):
                    yield os.path.join(root, file)

def analyze_function(filepath, func_name, lines, start_idx, end_idx):
    # Find the index of the primary security check
    sec_check_idx = -1
    for i in range(start_idx, end_idx):
        if re.search(r'(auth\(|currentUser\(|verifyVendorAccess\(|checkSuperAdmin\(|verifyData\.success)', lines[i]):
            sec_check_idx = i
            break
            
    if sec_check_idx == -1:
        return # Handled by previous check
        
    # Check for early returns before the security check
    for i in range(start_idx, sec_check_idx):
        if 'return' in lines[i] or 'continue' in lines[i] or 'break' in lines[i]:
            # Ignore logger/telemetry early returns if they are completely safe, but we'll flag all for manual review
            if 'return runWithCorrelationId' not in lines[i]:
                print(f"[EARLY RETURN BEFORE AUTH] {filepath}:{i+1} -> {lines[i].strip()}")

    # Check if the security check is inside an IF block (i.e. conditional auth)
    # We can approximate this by checking the indentation of the security check
    # compared to the indentation of the function start. But that's noisy if it's inside runWithCorrelationId
    # Let's look for `if (` before the auth check that encapsulates the auth check.
    # Actually, a simpler way: just check if the line with auth() starts with `if (` or is inside a try/catch.
    
    # Check for empty try/catch blocks
    for i in range(start_idx, end_idx):
        if 'catch' in lines[i]:
            catch_idx = i
            # Look for throw, return, or exit in the catch block
            has_exit = False
            for j in range(catch_idx, min(catch_idx + 15, end_idx)):
                if 'throw ' in lines[j] or 'return ' in lines[j] or 'process.exit' in lines[j] or 'NextResponse.json' in lines[j]:
                    has_exit = True
                    break
                if '}' in lines[j] and get_indent(lines[j]) == get_indent(lines[catch_idx]):
                    break # end of catch block
            if not has_exit:
                print(f"[SWALLOWED ERROR] {filepath}:{catch_idx+1} -> {lines[catch_idx].strip()}")

def analyze_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.read().split('\n')
        
    in_func = False
    func_name = ""
    start_idx = 0
    brace_count = 0
    
    for i, line in enumerate(lines):
        if not in_func:
            match = re.search(r'export (async function|const \w+ = async)', line)
            if match:
                in_func = True
                start_idx = i
                brace_count = line.count('{') - line.count('}')
        else:
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0:
                in_func = False
                analyze_function(filepath, func_name, lines, start_idx, i)

for f in find_ts_files(['features', 'app/api', 'shared']):
    analyze_file(f)
