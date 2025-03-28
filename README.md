
# EaseParkHK (泊易香港)  
![EaseParkHK Icon](https://cdn.discordapp.com/attachments/1250095432848113664/1347509303157985311/icon.png?ex=67e71c15&is=67e5ca95&hm=7ed6d4438614907f137b19d32b2baa383308506d3ecc25e1b8275793164dc18d&)

EaseParkHK is a Flask-based car park vacancy system providing real-time parking information for car parks across Hong Kong districts.

## Features

- Real-time vacancy updates for private cars, motorcycles, LGVs, HGVs, and coaches
- Filter car parks by vehicle type
- Detailed info: address, contact, hourly rates, and opening status
- Interactive map view of car park locations
- District-based filtering and favorite car parks feature
- Multilingual support (English & Traditional Chinese)
- Traffic camera feeds and notices

## Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/HenryLok0/EaseParkHK
   cd EaseParkHK
   ```
2. Set up a virtual environment:
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Add test data:
   ```sh
   python test_data.py
   ```
5. Run the app:
   ```sh
   flask --debug run --host=0.0.0.0
   ```

## Ports

- `5050`: Docker pgAdmin (database management)
- `8025`: MailHog (email testing for password resets)

## Usage

- Visit `http://localhost:5000` in your browser.
- Browse car parks by district, filter by vehicle type, and explore details or map view.
- Save favorites for quick access.
- Access pgAdmin at `http://localhost:5050` for database management.
- Check MailHog at `http://localhost:8025` for password reset emails.

## Collaborators

- **Leader**: Henry Lok ([HenryLok0](https://github.com/HenryLok0))
- **Members**:
  - Ben Ho ([HoChiWa01](https://github.com/HoChiWa01))
  - Peter Chan ([Peterop-Chan](https://github.com/Peterop-Chan))
  - Percy Wong ([wongpakhei](https://github.com/wongpakhei))

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for more info.

