-- Data Profiling --
create database api_logs;
use api_logs;

CREATE TABLE api_logs_raw (
	timestamp TIMESTAMP,
    service_name VARCHAR(100),
    endpoint VARCHAR(200),
    status_code INT,
    response_time_ms INT,
    release_version VARCHAR(20),
    server_region VARCHAR(50)
);

SET GLOBAL local_infile = 1;

LOAD DATA LOCAL INFILE 'D:/Application Performance & Reliability Analytics Dashboard/api_logs_uncleaned.csv'
INTO TABLE api_logs_raw
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;

SHOW VARIABLES LIKE 'local_infile';

select count(*) from api_logs_raw;
select * from api_logs_raw limit 5;

select
	sum(service_name is null) as null_service,
    sum(endpoint is null or endpoint = '') as null_endpoint,
    sum(status_code is null) as null_status,
    sum(response_time_ms is null) as null_latency
from api_logs_raw;

select count(*) from api_logs_raw where status_code not between 200 and 599
or response_time_ms <= 0;

-- Create Clean Table --
create table api_logs as
	select distinct
    timestamp,
    coalesce(service_name, 'unknown_service') as service_name,
    lower(trim(endpoint)) as endpoint,
    status_code,
    response_time_ms,
    coalesce(release_version, 'unknown') as release_version,
    coalesce(server_region, 'unknown') as server_region
from api_logs_raw
where status_code between 200 and 599 and response_time_ms > 0;

-- Validate Cleaning --
select
	(select count(*) from api_logs_raw) as raw_rows,
    (select count(*) from api_logs) as clean_rows;
    
select count(*) from api_logs where endpoint is null or service_name is null;

CREATE TABLE api_logs_clean AS
SELECT DISTINCT
    timestamp,
    COALESCE(service_name, 'unknown-service') AS service_name,
    CASE
        WHEN endpoint IS NULL OR endpoint = '' THEN 'unknown-endpoint'
        ELSE LOWER(TRIM(endpoint))
    END AS endpoint,
    status_code,
    response_time_ms,
    COALESCE(release_version, 'unknown') AS release_version,
    COALESCE(server_region, 'unknown') AS server_region
FROM api_logs
WHERE
    status_code BETWEEN 200 AND 599
    AND response_time_ms > 0;

SELECT COUNT(*)
FROM api_logs_clean
WHERE endpoint = 'unknown-endpoint'
   OR service_name = 'unknown-service';

SELECT COUNT(*)
FROM api_logs_clean
WHERE endpoint IS NULL
   OR service_name IS NULL;

SELECT
  (SELECT COUNT(*) FROM api_logs) AS raw_rows,
  (SELECT COUNT(*) FROM api_logs_clean) AS clean_rows;

-- Analysis --
with ranked as (
select
endpoint,
response_time_ms,
ntile(20) over (partition by endpoint order by response_time_ms) as bucket
from api_logs_clean
)
select endpoint,
avg(response_time_ms) as avg_latency,
max(response_time_ms) as p95_latency
from ranked
where bucket = 20
group by endpoint;

SELECT
    endpoint,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS error_rate
FROM api_logs_clean
GROUP BY endpoint;

SELECT
    DATE(timestamp) AS log_date,
    AVG(response_time_ms) AS avg_latency,
    MAX(response_time_ms) AS max_latency
FROM api_logs_clean
GROUP BY DATE(timestamp)
ORDER BY log_date;
