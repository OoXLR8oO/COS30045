import pandas as pd

def clean_data(input_file, output_file):
    # Read the CSV file
    df = pd.read_csv(input_file)

    # Clean the data: Remove rows with missing values
    df = df.dropna()

    # You can add more cleaning steps here if needed, for example:
    # - Convert date columns to datetime objects
    # - Remove duplicate rows
    # - Replace or remove outliers

    # Save the cleaned data as a new CSV file
    df.to_csv(output_file, index=False)

if __name__ == "__main__":
    input_file = "demographics_residing_afg.csv"
    output_file = "cleaned_demographics_residing_afg.csv"
    clean_data(input_file, output_file)
