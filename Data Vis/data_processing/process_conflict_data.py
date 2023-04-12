import pandas as pd

# Read the conflict data
conflict_data = pd.read_csv('afghan_violence_data.csv')

# Check for missing values and handle them if necessary
if conflict_data.isnull().sum().sum() > 0:
    # Fill missing values with appropriate method (e.g., 0 or forward fill)
    # Example: Fill with 0
    conflict_data = conflict_data.fillna(0)

# Convert the 'Month' column to a numeric format (e.g., 'January' to 1)
conflict_data['Month'] = pd.to_datetime(conflict_data['Month'], format='%B').dt.month

# Combine 'Month' and 'Year' columns into a single 'Date' column
conflict_data['Date'] = pd.to_datetime(conflict_data[['Year', 'Month']].assign(day=1))

# Keep only the 'Date' and 'Fatalities' columns
conflict_data = conflict_data[['Date', 'Fatalities']]

# Save the preprocessed conflict event dataset
conflict_data.to_csv('preprocessed_conflict_data.csv', index=False)
