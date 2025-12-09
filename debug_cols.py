import akshare as ak
import pandas as pd

try:
    df = ak.macro_rmb_deposit()
    print(df.columns.tolist())
except Exception as e:
    print(e)
