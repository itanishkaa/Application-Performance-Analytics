import pandas as pd
from sqlalchemy import create_engine

df = pd.read_csv(
    r"D:/Application Performance & Reliability Analytics Dashboard/api_logs_uncleaned.csv"
)

engine = create_engine(
    "mysql+pymysql://root:root@localhost:3306/api_logs"
)

df.to_sql(
    "api_logs_raw",
    engine,
    if_exists="append",
    index=False
)

print("Data loaded successfully!")