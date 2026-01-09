# 📊 Application Performance Analytics Dashboard

## 📌 Project Overview

This project focuses on analyzing **application performance and reliability** using raw backend log data.
The goal is to transform **uncleaned system logs** into **actionable insights** that help monitor latency, error trends, endpoint stability, and release impact.

The project follows an **end-to-end data analytics workflow**:

> Data ingestion → Data cleaning → Analysis → Visualization

---

## 🧩 Problem Statement

Modern applications generate large volumes of log data, but raw logs are often:

* Inconsistent
* Incomplete
* Difficult to interpret without analysis

This project answers key operational questions:

* How does application latency change over time?
* Which endpoints are slow or unreliable?
* Did recent releases improve or degrade performance?
* Where should optimization efforts be prioritized?

---

## 🛠 Tech Stack

* **Database:** MySQL
* **Querying & Analysis:** SQL
* **Data Processing:** Python (Pandas)
* **Visualization:** Power BI

---

## 📂 Dataset Description

The dataset consists of **application access logs** with the following fields:

* `timestamp` – Request time
* `service_name` – Backend service
* `endpoint` – API endpoint
* `status_code` – HTTP response code
* `response_time_ms` – Request latency
* `release_version` – Application release
* `server_region` – Deployment region

### ⚠️ Data Quality Challenges

The raw data intentionally contained:

* Missing endpoint and service names
* Inconsistent endpoint formats (`/login`, `/login/`)
* Duplicate records
* Invalid and extreme latency values

These issues were handled during the cleaning phase.

---

## 🧹 Data Cleaning & Preparation

Data cleaning was performed using **SQL and Python**, including:

* Removing duplicate records
* Filtering invalid status codes and negative latency values
* Standardizing endpoint naming
* Handling missing values using meaningful placeholders
* Validating cleaned data through row-count and null checks

A clean analytical table (`api_logs_clean`) was created for downstream analysis.

---

## 📈 Key Analysis Performed

### 🔹 Performance Metrics

* Average latency
* P95 latency (tail latency)
* Maximum observed latency

### 🔹 Reliability Metrics

* System error rate (HTTP 5xx only)
* Request volume

### 🔹 Analytical Views

* **Daily latency trends** (time-series analysis)
* **Endpoint stability analysis** (latency + error rate)
* **Release-wise comparison** to assess deployment impact

Outlier analysis was performed using percentile-based methods (p95 / p99), which are more suitable for performance data than traditional IQR.

---

## 📊 Dashboard Overview (Power BI)

The Power BI dashboard contains three pages:

### 1️⃣ Overview

* KPI cards for latency, error rate, and request volume
* Daily average latency trend
* Interactive filters for date, endpoint, and release

### 2️⃣ Endpoint Stability

* Endpoint-level performance table
* Conditional formatting to highlight slow or unreliable APIs
* Bar chart showing average latency by endpoint

### 3️⃣ Release Analysis

* Latency comparison across releases
* System error rate by release
* Insights into post-deployment performance changes

The dashboard supports **ad-hoc analysis** through dynamic slicers.

---

## 🔍 Key Insights

* Latency fluctuations were observed during specific periods, indicating potential load or infrastructure issues
* Certain endpoints consistently exhibited higher response times
* System error rates remained relatively stable across releases, with no major regressions detected
* Performance differences across releases were marginal but measurable

---

## 📌 Future Enhancements

* Add real-time or streaming data ingestion
* Extend analysis to region-wise performance comparison
* Automate data refresh and reporting
