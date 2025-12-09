import akshare as ak

print("Searching for functions related to 'deposit' or 'rate' in akshare...")
for attr in dir(ak):
    if "deposit" in attr.lower() or ("rate" in attr.lower() and "china" in attr.lower()):
        print(attr)
