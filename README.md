# UBC Workday Schedule to Calendar Converter

A client-side web application that converts UBC Workday course schedules (Excel format) into calendar files (.ics) compatible with Google Calendar, Apple Calendar, Outlook, and other calendar applications.

## Features

- **100% Client-Side Processing**: All data processing happens in your browser. No data is uploaded to any server, ensuring complete privacy.
- **Drag & Drop Interface**: Simply drag your Excel file onto the page or click to browse.
- **Automatic Schedule Parsing**: Extracts course information including:
  - Course codes and names
  - Meeting times and locations
  - Instructor information
  - Term dates and reading breaks
- **Recurring Events**: Generates proper recurring calendar events with correct start/end dates.
- **Multiple Terms Support**: Handles courses across different terms (Fall, Winter, Summer).
- **Timezone Support**: Properly configured for Vancouver timezone (PST/PDT).

## Live Demo

Visit the live application at: [https://voctory.github.io/workday-cal/](https://voctory.github.io/workday-cal/)

## Usage

1. **Export your schedule from UBC Workday**:
   - Log into UBC Workday
   - Navigate to your course schedule
   - Export as Excel (.xlsx) file

2. **Upload to the converter**:
   - Open the converter website
   - Drag and drop your Excel file onto the upload area
   - Or click "Browse Files" to select your file

3. **Review your courses**:
   - The application will display all parsed courses
   - Verify the schedule information is correct

4. **Download calendar file**:
   - Click "Download Calendar (.ics)"
   - Import the downloaded file into your preferred calendar application

## Importing to Calendar Applications

### Google Calendar
1. Open Google Calendar
2. Click the gear icon → Settings
3. Select "Import & Export" from the left menu
4. Click "Select file from your computer"
5. Choose the downloaded .ics file
6. Select which calendar to add events to
7. Click "Import"

### Apple Calendar (Mac)
1. Open Calendar app
2. File → Import
3. Select the .ics file
4. Choose which calendar to add events to
5. Click "Import"

### Outlook
1. Open Outlook Calendar
2. File → Open & Export → Import/Export
3. Select "Import an iCalendar (.ics) file"
4. Browse to the .ics file
5. Click "Import"

## Development

### Prerequisites
- Modern web browser with JavaScript enabled
- No build tools or Node.js required for basic usage

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/voctory/workday-cal.git
   cd workday-cal
   ```

2. Start a local server (any method works):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js http-server
   npx http-server
   ```

3. Open http://localhost:8000 in your browser

### Running Tests
Open `tests/test.html` in your browser to run the test suite.

### Project Structure
```
workday-cal/
├── index.html           # Main application page
├── css/
│   └── styles.css      # Application styles
├── js/
│   ├── app.js          # Main application logic
│   ├── parser.js       # Excel parsing module
│   └── calendar.js     # ICS generation module
├── tests/
│   ├── test.html       # Test runner page
│   └── test-suite.js   # Unit tests
└── test-data/
    └── sample-courses.json  # Anonymized test data
```

## Technical Details

### Excel Format Support
The application expects Excel files exported from UBC Workday with the following structure:
- Headers at row 6
- Course data starting from row 7
- Specific columns for course details, meeting patterns, dates, etc.

### Calendar Generation
- Generates RFC 5545 compliant iCalendar (.ics) files
- Supports recurring events with RRULE
- Handles timezone transitions (PST/PDT)
- Includes course details in event descriptions

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Privacy & Security

- **No Server Upload**: All processing happens locally in your browser
- **No Data Storage**: No course data is stored or cached
- **No Analytics**: No tracking or analytics code
- **Open Source**: Full source code available for inspection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Issues

- Some complex course schedules with multiple instructors or irregular meeting patterns may require manual adjustment
- Laboratory sections with alternating weeks may not be fully supported
- Online/hybrid courses with asynchronous components may not generate calendar events

## Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/voctory/workday-cal/issues) page
2. Create a new issue with:
   - Description of the problem
   - Browser and version
   - Anonymized sample of problematic data (if applicable)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [SheetJS](https://sheetjs.com/) for Excel file parsing
- Inspired by the need for easier course schedule management at UBC
- Thanks to all contributors and testers

## Disclaimer

This tool is not officially affiliated with or endorsed by the University of British Columbia. It is an independent project created to help students manage their course schedules more effectively.
