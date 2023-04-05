import pandas as pd

# Define the column names
column_names = ['ADM1NameEnglish', 'ADM2NameEnglish', 'SettlementCode', 'Arrival IDPs', 'Fled IDPs', 'Returned IDPs', 'Outmigrants', 'Returnees from Abroad']

# Read the IDP dataset
idp_data = pd.read_csv('afghan_idp_data.csv', skiprows=1, header=None)  # Skip the first row since it contains redundant headers
idp_data.columns = column_names

# Drop rows with missing data
idp_data.dropna(inplace=True)

# Ensure numeric columns have the correct data type
numeric_columns = ['Arrival IDPs', 'Fled IDPs', 'Returned IDPs', 'Outmigrants', 'Returnees from Abroad']
idp_data[numeric_columns] = idp_data[numeric_columns].apply(pd.to_numeric, errors='coerce')

# Drop rows with invalid numeric values (after coercion to numeric)
idp_data.dropna(subset=numeric_columns, inplace=True)

# Create a new column 'Net_IDPs'
idp_data['Net_IDPs'] = (idp_data['Arrival IDPs'] - idp_data['Fled IDPs']) + (idp_data['Returned IDPs'] - idp_data['Outmigrants']) + idp_data['Returnees from Abroad']

# Aggregate the data by province
province_data = idp_data.groupby('ADM1NameEnglish').agg({'Arrival IDPs': 'sum', 'Fled IDPs': 'sum'}).reset_index()

# Save the cleaned dataset to a new CSV file
# idp_data.to_csv('preprocessed_idp_data.csv', index=False)

# Save the aggregated data to a CSV file
province_data.to_csv('province_data.csv', index=False)
