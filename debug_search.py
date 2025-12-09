import akshare as ak

print("Searching for 'deposit' or 'rate' in akshare attributes...")
candidates = []
for attr in dir(ak):
    if ('deposit' in attr.lower() or 'interest' in attr.lower() or 'rate' in attr.lower()) and 'macro' in attr.lower():
        candidates.append(attr)

print("\nCandidates found:")
for c in candidates:
    print(c)
