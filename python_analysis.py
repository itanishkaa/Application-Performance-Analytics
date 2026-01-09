import pandas as pd
from sqlalchemy import create_engine
from scipy.stats import zscore

engine = create_engine(
    "mysql+pymysql://root:root@localhost:3306/api_logs"
)

df = pd.read_sql("SELECT * FROM api_logs_clean", engine)

# Detect Latency Outliers
# IQR
Q1 = df['response_time_ms'].quantile(0.25)
Q3 = df['response_time_ms'].quantile(0.75)
IQR = Q3 - Q1

outliers = df[
    (df['response_time_ms'] < Q1 - 1.5 * IQR) |
    (df['response_time_ms'] > Q3 + 1.5 * IQR)
]

print(f"Outlier count: {len(outliers)}")

# Percentile based outliers (best for performance data)
p99 = df['response_time_ms'].quantile(0.99)

outliers = df[df['response_time_ms'] > p99]

print(f"P99 threshold: {p99}")
print(f"Outlier count (P99): {len(outliers)}")

# Endpoint specific outliers
endpoint_outliers = df.groupby('endpoint').apply(
    lambda x: x[x['response_time_ms'] > x['response_time_ms'].quantile(0.95)]
).reset_index(drop=True)

print(f"Endpoint-level outliers: {len(endpoint_outliers)}")

# Z-score method
df['z_score'] = zscore(df['response_time_ms'])
outliers = df[df['z_score'].abs() > 3]

print(f"Z-score outliers: {len(outliers)}")

# Release-wise analysis
release_perf = df.groupby('release_version').agg(
    avg_latency = ('response_time_ms', 'mean'),
    p95_latency = ('response_time_ms', lambda x: x.quantile(0.95)),
    error_rate = ('status_code', lambda x: (x >= 400).mean() * 100)
).reset_index()

print(release_perf)

# Endpoint Stability Score
endpoint_score = df.groupby('endpoint').agg(
    avg_latency=('response_time_ms', 'mean'),
    error_rate=('status_code', lambda x: (x >= 400).mean() * 100)
)

endpoint_score['stability_score'] = (
    endpoint_score['avg_latency'] * 0.6 +
    endpoint_score['error_rate'] * 0.4
)

endpoint_score.sort_values('stability_score', ascending=False).head(10)
