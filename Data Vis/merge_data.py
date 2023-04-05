import pandas as pd
from datetime import datetime

# Read the conflict data
conflict_data = pd.read_csv('conflict_data.csv', parse_dates=['Date'], dayfirst=True)
conflict_data['Date'] = conflict_data['Date'].dt.to_period('M')

# Read the IDP data
idp_data = pd.read_csv('province_data.csv', parse_dates=['Date'], dayfirst=True)
idp_data['Date'] = idp_data['Date'].dt.to_period('M')

# Aggregate the IDP data by month
idp_data_agg = idp_data.groupby(['Date'])['Arrival IDPs'].sum().reset_index()

# Merge the datasets
merged_data = conflict_data.merge(idp_data_agg, on='Date', how='left')

# Save the merged data to a CSV file
merged_data.to_csv('merged_data.csv', index=False)
