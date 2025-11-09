## Setup (macOS/Linux)

1. Create a virtual environment

```bash
python3 -m venv venv
```

2. Activate the virtual environment

```bash
source venv/bin/activate
```

3. Install dependencies

```bash
pip install -r requirements.txt
```

## Requirements

Make sure your `.env` file in the project root contains:
- `SUPABASE_DIRECT_CONNECTION_URL` - Your Supabase PostgreSQL connection string
- `PROJECTS_SHEET_URL` - CSV export URL for projects data
- `ACTIVES_SHEET_URL` - CSV export URL for actives data
- `ATTENDANCE_URL` - CSV export URL for attendance data

running all cells in `clean.ipynb` will clean the data and migrate it to the database.
