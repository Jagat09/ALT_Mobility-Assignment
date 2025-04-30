# Alt Mobility Data Analysis Project

This repository contains SQL queries and visualizations for the Alt Mobility Data Analyst Intern assignment. The project analyzes order and payment data to provide insights that can help improve Alt Mobility's EV leasing operations.

## Project Overview

Alt Mobility is a full-stack EV leasing and asset management company that manages a fleet of 20,000 electric vehicles. This data analysis project aims to extract actionable insights from the company's order and payment data to improve operations as they scale across India.

## Dataset Description

The analysis was performed on two primary datasets:

1. **customer_orders.csv** - Contains information about customer orders including:
   - order_id
   - customer_id
   - order_date
   - order_amount
   - shipping_address
   - order_status

2. **payments.csv** - Contains information about payments including:
   - payment_id
   - order_id
   - payment_date
   - payment_amount
   - payment_method
   - payment_status

## Analysis Tasks

### 1. Order and Sales Analysis

The SQL queries in this section analyze order status and sales data to provide insights into order fulfillment and revenue trends, including:
- Distribution of orders by status
- Sales amount by order status
- Monthly order and sales trends
- Quarterly sales analysis

Key findings:
- Orders are evenly distributed across statuses (pending, shipped, delivered)
- Consistent revenue generation across all order statuses
- Identifiable seasonal patterns with Q4 showing higher sales volumes

### 2. Customer Analysis

This section explores customer ordering behavior to identify patterns such as:
- Repeat ordering frequency
- Customer segmentation by spending
- High-value customer identification
- Customer lifetime analysis

Key findings:
- The majority of customers (79%) make only 1-2 orders
- A small segment of high-value customers (1%) contributes disproportionately to revenue
- Average order value increases slightly for repeat purchases

### 3. Payment Status Analysis

These queries investigate payment status data to identify issues and trends related to:
- Payment status distribution
- Payment method preferences
- Success/failure rates by payment method
- Payment status trends over time

Key findings:
- Low payment success rates across all payment methods (approximately 33%)
- Slight variations in success rates between payment methods
- Opportunity for payment processing optimization

### 4. Order Details Report

A comprehensive report that provides a detailed overview of:
- Order fulfillment with payment status
- Order payment reconciliation analysis
- Customer order profiles

### 5. Customer Retention Analysis

Visualization of customer retention showing how many customers from specific cohorts made repeat purchases in subsequent months, revealing:
- Very low overall retention rates (typically below 5%)
- Consistent retention patterns across different time periods
- Opportunity for focused retention strategy development

## SQL Queries

The repository includes various SQL queries organized by analysis category. Each query is properly commented to explain its purpose and the insights it aims to extract.

## Visualizations

The visualizations include:
1. Customer Retention Analysis - Cohort visualization showing retention rates over time
2. Order and Sales Analysis Dashboard - Interactive dashboard for exploring sales trends
3. Payment Status Analysis - Detailed breakdown of payment processing metrics

## Key Recommendations

Based on the analysis, the following recommendations are provided:

1. **Payment Processing Improvements**:
   - Implement automated payment retry mechanisms
   - Optimize credit card payment flow to reduce failures
   - Enhance payment validation processes

2. **Customer Retention Initiatives**:
   - Develop a structured loyalty program
   - Implement systematic post-purchase engagement
   - Create targeted win-back campaigns

3. **Customer Segmentation Strategy**:
   - Establish a VIP program for high-value customers
   - Focus on moving customers up the value tiers
   - Enhance first-time customer experience

4. **Operational Improvements**:
   - Optimize order fulfillment process to reduce pending time
   - Implement seasonal planning for inventory management
   - Address payment-order amount reconciliation issues

## Conclusion

The analysis shows that Alt Mobility has established a steady customer acquisition process but faces challenges in payment processing efficiency and customer retention. By focusing on these areas, the company can improve operational efficiency and customer loyalty, which will be crucial for sustainable growth in the competitive EV leasing market.
