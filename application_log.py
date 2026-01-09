import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker()

NUM_RECORDS = 50000
START_DATE = datetime.now() - timedelta(days=60)

services = ["auth-service", "user-service", "order-service", None]
endpoints = ["/login", "/Login", "/login/", "/profile", None, ""]
status_codes = [200, 201, 400, 401, 404, 500, 503, 999, None]
regions = ["us-east", "us-west", "eu-central", "ap-south", None]
releases = ["v1.0", "v1.1", "v2.0", None]

data = []

for _ in range(NUM_RECORDS):
    record = {
        "timestamp": random.choice([
            START_DATE + timedelta(minutes=random.randint(0, 86400))
        ]),
        "service_name": random.choice(services),
        "endpoint": random.choice(endpoints),
        "status_code": random.choice(status_codes),
        "response_time_ms": random.choice([
            int(np.random.normal(300, 100)),
            int(np.random.normal(1200, 300)),
            -1,
            None
        ]),
        "release_version": random.choice(releases),
        "server_region": random.choice(regions)
    }

    if random.random() < 0.05:
        data.append(record)
    
    data.append(record)

df = pd.DataFrame(data)
df.to_csv("api_logs_uncleaned.csv", index=False)

print("Uncleaned API log data generated!")