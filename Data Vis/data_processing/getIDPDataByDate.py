import pandas as pd

# Read the data from the Excel file
file_name = "afghan_idp_data.xlsx"
sheet_name = "14107_Settlements"
data = pd.read_excel(file_name, sheet_name=sheet_name, engine='openpyxl')

# Select the required columns
columns = [
    "ADM1NameEnglish",
    "ArrivalIDPs2012_18",
    "ArrivalIDPs2019",
    "ArrivalIDPs2020",
    "ArrivalIDPs2021",
    "ArrivalIDPs2022",
    "FledIDPs2012_18",
    "FledIDPs2019",
    "FledIDPs2020",
    "FledIDPs2021",
    "FledIDPs2022",
]
selected_data = data[columns]

# Save the selected data as a new CSV file
output_csv = "idp_19_22.csv"
selected_data.to_csv(output_csv, index=False)


