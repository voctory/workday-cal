/**
 * Main application logic
 */

class WorkdayCalendarApp {
    constructor() {
        this.parser = new WorkdayParser();
        this.calendar = new CalendarGenerator();
        this.calendarView = new CalendarView();
        this.courses = [];
        this.currentView = 'list';
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        this.uploadSection = document.getElementById('upload-section');
        this.previewSection = document.getElementById('preview-section');
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.courseList = document.getElementById('course-list');
        this.downloadBtn = document.getElementById('download-ics');
        this.resetBtn = document.getElementById('reset');
        this.selectAllBtn = document.getElementById('select-all');
        this.selectNoneBtn = document.getElementById('select-none');
        this.selectionCount = document.getElementById('selection-count');
        this.googleBtn = document.getElementById('google-calendar');
        this.appleBtn = document.getElementById('apple-calendar');
        this.outlookBtn = document.getElementById('outlook-web');
        this.copyBtn = document.getElementById('copy-events');
        
        // View toggle elements
        this.listViewBtn = document.getElementById('list-view-btn');
        this.calendarViewBtn = document.getElementById('calendar-view-btn');
        this.listView = document.getElementById('list-view');
        this.calendarViewContainer = document.getElementById('calendar-view');
        this.saveImageBtn = document.getElementById('save-calendar-image');
        
        // Track selected courses
        this.selectedCourses = new Set();
    }

    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Make entire dropzone clickable
        this.dropzone.addEventListener('click', (e) => {
            // Don't trigger if clicking on the file input label itself
            if (e.target.tagName !== 'LABEL' && !e.target.closest('.file-label')) {
                this.fileInput.click();
            }
        });

        // Drag and drop events
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Download button
        this.downloadBtn.addEventListener('click', () => {
            this.downloadCalendar();
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        // View toggle buttons
        this.listViewBtn.addEventListener('click', () => this.switchView('list'));
        this.calendarViewBtn.addEventListener('click', () => this.switchView('calendar'));
        
        // Save calendar image button
        if (this.saveImageBtn) {
            this.saveImageBtn.addEventListener('click', () => this.saveCalendarAsImage());
        }
        
        // Select all/none buttons
        this.selectAllBtn.addEventListener('click', () => {
            this.selectAllCourses();
        });
        
        this.selectNoneBtn.addEventListener('click', () => {
            this.selectNoCourses();
        });
        
        // Export buttons
        this.googleBtn.addEventListener('click', () => {
            this.exportToGoogle();
        });
        
        this.appleBtn.addEventListener('click', () => {
            this.exportToApple();
        });
        
        this.outlookBtn.addEventListener('click', () => {
            this.exportToOutlook();
        });
        
        this.copyBtn.addEventListener('click', () => {
            this.copyEventsAsText();
        });

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    handleFile(file) {
        // Validate file type
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            this.showError('Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        // Clear any previous errors
        this.hideError();

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                this.courses = this.parser.parseExcel(data);
                
                if (this.courses.length === 0) {
                    this.showError('No courses found in the uploaded file. Please ensure you\'re uploading a UBC Workday course schedule.');
                    return;
                }

                this.displayCourses();
                this.showPreview();
            } catch (error) {
                console.error('Error processing file:', error);
                // Show the error message directly without wrapping
                this.showError(error.message);
            }
        };

        reader.onerror = () => {
            this.showError('Error reading file. Please try again.');
        };

        reader.readAsArrayBuffer(file);
    }

    displayCourses() {
        this.courseList.innerHTML = '';
        this.selectedCourses.clear();
        
        // Group courses by code for better display
        const courseMap = new Map();
        
        for (const course of this.courses) {
            if (!courseMap.has(course.code)) {
                courseMap.set(course.code, course);
            }
        }
        
        // Separate courses by term
        const coursesByTerm = {
            'Winter Term 1': [],
            'Winter Term 2': [],
            'Summer Term 1': [],
            'Summer Term 2': [],
            'Summer Full Term': [],
            'Other': []
        };
        
        for (const [code, course] of courseMap) {
            const termInfo = this.determineTerm(course);
            
            // Handle Winter Full Year courses - add to both Term 1 and Term 2
            if (termInfo === 'Winter Full Year') {
                // Add to Term 1 with a marker
                coursesByTerm['Winter Term 1'].push({
                    ...course,
                    isFullYear: true,
                    displayName: `${course.name} (Full Year)`
                });
                // Add to Term 2 with a marker
                coursesByTerm['Winter Term 2'].push({
                    ...course,
                    isFullYear: true,
                    displayName: `${course.name} (Full Year)`
                });
            } else if (coursesByTerm[termInfo]) {
                coursesByTerm[termInfo].push(course);
            } else {
                coursesByTerm['Other'].push(course);
            }
        }
        
        // Define term display information
        const termDisplayInfo = {
            'Winter Full Year': { emoji: '🎓', dates: 'Sept - Apr' },
            'Winter Term 1': { emoji: '🍂', dates: 'Sept - Dec' },
            'Winter Term 2': { emoji: '❄️', dates: 'Jan - Apr' },
            'Summer Term 1': { emoji: '☀️', dates: 'May - June' },
            'Summer Term 2': { emoji: '🌻', dates: 'July - Aug' },
            'Summer Full Term': { emoji: '🌞', dates: 'May - Aug' },
            'Other': { emoji: '📚', dates: '' }
        };
        
        // Display courses by term
        let index = 0;
        for (const [termName, courses] of Object.entries(coursesByTerm)) {
            if (courses.length === 0) continue;
            
            const termInfo = termDisplayInfo[termName];
            const headerText = termInfo.dates ? 
                `${termInfo.emoji} ${termName} (${termInfo.dates})` : 
                `${termInfo.emoji} ${termName}`;
            
            const termHeader = document.createElement('div');
            termHeader.className = 'term-header';
            termHeader.innerHTML = `<h3>${headerText}</h3><span class="term-count">${courses.length} course${courses.length !== 1 ? 's' : ''}</span>`;
            this.courseList.appendChild(termHeader);
            
            const termContainer = document.createElement('div');
            termContainer.className = 'term-container';
            
            for (const course of courses) {
                const courseElement = this.createCourseElement(course, index);
                termContainer.appendChild(courseElement);
                this.selectedCourses.add(index);
                index++;
            }
            this.courseList.appendChild(termContainer);
        }
        
        this.updateSelectionCount();
        
        // Also update calendar view if it's active
        if (this.currentView === 'calendar') {
            this.calendarView.render(this.courses);
        }
    }
    
    determineTerm(course) {
        // Check the student info for term information first
        if (course.student && course.student.term) {
            const termInfo = course.student.term.toLowerCase();
            
            // Full year
            if (termInfo.includes('full year') || termInfo.includes('year long')) return 'Winter Full Year';
            
            // Winter terms
            if (termInfo.includes('winter') && termInfo.includes('term 1')) return 'Winter Term 1';
            if (termInfo.includes('winter') && termInfo.includes('term 2')) return 'Winter Term 2';
            
            // Summer terms
            if (termInfo.includes('summer') && termInfo.includes('term 1')) return 'Summer Term 1';
            if (termInfo.includes('summer') && termInfo.includes('term 2')) return 'Summer Term 2';
            
            // Generic terms (fallback)
            if (termInfo.includes('term 1')) return 'Winter Term 1';
            if (termInfo.includes('term 2')) return 'Winter Term 2';
        }
        
        // Check based on start/end dates
        if (course.startDate && course.endDate) {
            const startMonth = parseInt(course.startDate.split('-')[1]);
            const endMonth = parseInt(course.endDate.split('-')[1]);
            
            // Winter Full Year: Sept-Apr (starts in 9-10, ends in 3-4)
            if (startMonth >= 9 && endMonth >= 3 && endMonth <= 4) {
                return 'Winter Full Year';
            }
            // Winter Term 1: Sept-Dec (months 9-12)
            else if (startMonth >= 9 && endMonth <= 12) {
                return 'Winter Term 1';
            }
            // Winter Term 2: Jan-Apr (months 1-4)
            else if (startMonth >= 1 && startMonth <= 4 && endMonth <= 4) {
                return 'Winter Term 2';
            }
            // Summer Term 1: May-June (month 5-6)
            else if (startMonth >= 5 && startMonth <= 6 && endMonth <= 6) {
                return 'Summer Term 1';
            }
            // Summer Term 2: July-Aug (month 7-8)
            else if (startMonth >= 7 && startMonth <= 8) {
                return 'Summer Term 2';
            }
            // Full Summer: May-Aug (months 5-8, spanning both terms)
            else if (startMonth >= 5 && endMonth >= 7) {
                return 'Summer Full Term';
            }
        }
        
        // Check meeting patterns for date ranges
        if (course.meetings && course.meetings.length > 0) {
            const firstMeeting = course.meetings[0];
            if (firstMeeting.startDate && firstMeeting.endDate) {
                const startMonth = parseInt(firstMeeting.startDate.split('-')[1]);
                const endMonth = parseInt(firstMeeting.endDate.split('-')[1]);
                
                // Winter Full Year
                if (startMonth >= 9 && endMonth >= 3 && endMonth <= 4) return 'Winter Full Year';
                if (startMonth >= 9 && endMonth <= 12) return 'Winter Term 1';
                if (startMonth >= 1 && startMonth <= 4 && endMonth <= 4) return 'Winter Term 2';
                if (startMonth >= 5 && startMonth <= 6 && endMonth <= 6) return 'Summer Term 1';
                if (startMonth >= 7 && startMonth <= 8) return 'Summer Term 2';
                if (startMonth >= 5 && endMonth >= 7) return 'Summer Full Term';
            }
        }
        
        return 'Other';
    }

    createCourseElement(course, index) {
        const div = document.createElement('div');
        div.className = 'course-item';
        div.dataset.index = index;
        
        // Add checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'course-checkbox';
        checkbox.checked = true;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedCourses.add(index);
                div.classList.remove('unchecked');
            } else {
                this.selectedCourses.delete(index);
                div.classList.add('unchecked');
            }
            this.updateSelectionCount();
        });
        div.appendChild(checkbox);
        
        const title = document.createElement('div');
        title.className = 'course-title';
        title.textContent = `${course.code} - ${course.displayName || course.name}`;
        div.appendChild(title);

        const details = document.createElement('div');
        details.className = 'course-details';
        
        const detailItems = [];
        if (course.section) detailItems.push(`<span>📚 ${course.section}</span>`);
        if (course.credits) detailItems.push(`<span>🎓 ${course.credits} credits</span>`);
        if (course.instructor) detailItems.push(`<span>👨‍🏫 ${course.instructor}</span>`);
        if (course.format) detailItems.push(`<span>📖 ${course.format}</span>`);
        
        details.innerHTML = detailItems.join('');
        div.appendChild(details);

        // Add meeting times
        if (course.meetings && course.meetings.length > 0) {
            const schedule = document.createElement('div');
            schedule.className = 'course-schedule';
            
            for (const meeting of course.meetings) {
                const scheduleItem = document.createElement('div');
                scheduleItem.className = 'schedule-item';
                
                const days = meeting.days.map(d => {
                    const dayNames = { 'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu', 'FR': 'Fri', 'SA': 'Sat', 'SU': 'Sun' };
                    return dayNames[d] || d;
                }).join(', ');
                
                const timeStr = `${this.formatTime(meeting.startTime)} - ${this.formatTime(meeting.endTime)}`;
                const dateStr = `${this.formatDateRange(meeting.startDate, meeting.endDate)}`;
                
                scheduleItem.innerHTML = `
                    <strong>📅 ${days}</strong> ${timeStr}<br>
                    <small>${dateStr}</small><br>
                    ${meeting.location ? `<small>📍 ${meeting.location}</small>` : ''}
                `;
                
                schedule.appendChild(scheduleItem);
            }
            
            div.appendChild(schedule);
        }

        return div;
    }

    formatTime(time24) {
        if (!time24) return '';
        
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    formatDateRange(startDate, endDate) {
        if (!startDate || !endDate) return '';
        
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }

    showPreview() {
        this.uploadSection.style.display = 'none';
        this.previewSection.style.display = 'block';
    }

    hidePreview() {
        this.uploadSection.style.display = 'block';
        this.previewSection.style.display = 'none';
    }

    showError(message) {
        // Use innerText to preserve line breaks in error messages
        this.errorMessage.innerText = message;
        this.errorSection.style.display = 'block';
    }

    hideError() {
        this.errorSection.style.display = 'none';
        this.errorMessage.textContent = '';
    }

    updateSelectionCount() {
        const total = this.courseList.querySelectorAll('.course-item').length;
        const selected = this.selectedCourses.size;
        this.selectionCount.textContent = `${selected} of ${total} courses selected`;
    }
    
    selectAllCourses() {
        const courseItems = this.courseList.querySelectorAll('.course-item');
        courseItems.forEach((item) => {
            const checkbox = item.querySelector('.course-checkbox');
            const index = parseInt(item.dataset.index);
            if (checkbox && !isNaN(index)) {
                checkbox.checked = true;
                this.selectedCourses.add(index);
                item.classList.remove('unchecked');
            }
        });
        this.updateSelectionCount();
    }
    
    selectNoCourses() {
        const courseItems = this.courseList.querySelectorAll('.course-item');
        courseItems.forEach((item) => {
            const checkbox = item.querySelector('.course-checkbox');
            const index = parseInt(item.dataset.index);
            if (checkbox && !isNaN(index)) {
                checkbox.checked = false;
                this.selectedCourses.delete(index);
                item.classList.add('unchecked');
            }
        });
        this.updateSelectionCount();
    }
    
    getSelectedCourses() {
        // Get only selected courses
        const courseMap = new Map();
        for (const course of this.courses) {
            if (!courseMap.has(course.code)) {
                courseMap.set(course.code, course);
            }
        }
        
        const selectedCoursesList = [];
        let index = 0;
        for (const [code, course] of courseMap) {
            if (this.selectedCourses.has(index)) {
                selectedCoursesList.push(course);
            }
            index++;
        }
        return selectedCoursesList;
    }

    downloadCalendar() {
        try {
            const selectedCourses = this.getSelectedCourses();
            if (selectedCourses.length === 0) {
                this.showError('Please select at least one course to export');
                return;
            }
            
            const icsContent = this.calendar.generateICS(selectedCourses);
            
            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `ubc-schedule-${dateStr}.ics`;
            
            this.calendar.downloadICS(icsContent, filename);
        } catch (error) {
            console.error('Error generating calendar:', error);
            this.showError(`Error generating calendar: ${error.message}`);
        }
    }
    
    exportToGoogle() {
        try {
            const selectedCourses = this.getSelectedCourses();
            if (selectedCourses.length === 0) {
                this.showError('Please select at least one course to export');
                return;
            }
            
            // Generate ICS file
            const icsContent = this.calendar.generateICS(selectedCourses);
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            
            // Google Calendar import URL
            window.open('https://calendar.google.com/calendar/r/settings/export', '_blank');
            
            // Also download the file for manual import
            this.downloadCalendar();
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Error exporting to Google:', error);
            this.showError(`Error exporting to Google Calendar: ${error.message}`);
        }
    }
    
    exportToApple() {
        try {
            const selectedCourses = this.getSelectedCourses();
            if (selectedCourses.length === 0) {
                this.showError('Please select at least one course to export');
                return;
            }
            
            // Generate ICS content
            const icsContent = this.calendar.generateICS(selectedCourses);
            
            // Create a data URL for the ICS content
            const base64 = btoa(unescape(encodeURIComponent(icsContent)));
            const dataUrl = `data:text/calendar;base64,${base64}`;
            
            // Try to open directly with webcal:// protocol (works on macOS/iOS)
            // This will prompt to open in Calendar app
            const webcalUrl = dataUrl.replace('data:', 'webcal://');
            
            // Create a temporary link and click it
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `ubc-schedule-${new Date().toISOString().split('T')[0]}.ics`;
            
            // Check if we're on an Apple device
            const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
            
            if (isApple) {
                // On Apple devices, just download and the OS will handle it
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // The OS should automatically prompt to add to Calendar
            } else {
                // On non-Apple devices, download with instructions
                a.click();
                setTimeout(() => {
                    alert('Calendar file downloaded. If you\'re using iCloud Calendar on Windows, you can import this file at icloud.com/calendar');
                }, 500);
            }
        } catch (error) {
            console.error('Error exporting to Apple Calendar:', error);
            this.showError(`Error exporting to Apple Calendar: ${error.message}`);
        }
    }
    
    exportToOutlook() {
        try {
            const selectedCourses = this.getSelectedCourses();
            if (selectedCourses.length === 0) {
                this.showError('Please select at least one course to export');
                return;
            }
            
            // Open Outlook.com calendar import page
            window.open('https://outlook.live.com/calendar/0/addevent', '_blank');
            
            // Also download the file for manual import
            this.downloadCalendar();
        } catch (error) {
            console.error('Error exporting to Outlook:', error);
            this.showError(`Error exporting to Outlook: ${error.message}`);
        }
    }
    
    copyEventsAsText() {
        try {
            const selectedCourses = this.getSelectedCourses();
            if (selectedCourses.length === 0) {
                this.showError('Please select at least one course to export');
                return;
            }
            
            let text = 'UBC Course Schedule\n';
            text += '===================\n\n';
            
            for (const course of selectedCourses) {
                text += `${course.code} - ${course.name}\n`;
                if (course.instructor) text += `Instructor: ${course.instructor}\n`;
                if (course.credits) text += `Credits: ${course.credits}\n`;
                
                if (course.meetings && course.meetings.length > 0) {
                    for (const meeting of course.meetings) {
                        const days = meeting.days ? meeting.days.map(d => {
                            const dayNames = { 'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu', 'FR': 'Fri' };
                            return dayNames[d] || d;
                        }).join(', ') : '';
                        
                        text += `Schedule: ${days} ${this.formatTime(meeting.startTime)}-${this.formatTime(meeting.endTime)}\n`;
                        text += `Period: ${meeting.startDate} to ${meeting.endDate}\n`;
                        if (meeting.location) text += `Location: ${meeting.location}\n`;
                    }
                }
                text += '\n';
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                // Show success message
                const btn = document.getElementById('copy-events');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
                btn.classList.add('btn-success');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn-success');
                }, 2000);
            }).catch(err => {
                this.showError('Failed to copy to clipboard');
            });
        } catch (error) {
            console.error('Error copying events:', error);
            this.showError(`Error copying events: ${error.message}`);
        }
    }

    reset() {
        this.courses = [];
        this.selectedCourses.clear();
        this.fileInput.value = '';
        this.hidePreview();
        this.hideError();
        this.courseList.innerHTML = '';
    }
    
    switchView(view) {
        this.currentView = view;
        
        if (view === 'list') {
            this.listViewBtn.classList.add('active');
            this.calendarViewBtn.classList.remove('active');
            this.listView.style.display = 'block';
            this.calendarViewContainer.style.display = 'none';
        } else if (view === 'calendar') {
            this.listViewBtn.classList.remove('active');
            this.calendarViewBtn.classList.add('active');
            this.listView.style.display = 'none';
            this.calendarViewContainer.style.display = 'block';
            
            // Render calendar view
            if (this.courses.length > 0) {
                this.calendarView.render(this.courses);
            }
        }
    }
    
    async saveCalendarAsImage() {
        try {
            // Show loading state
            if (this.saveImageBtn) {
                const originalText = this.saveImageBtn.innerHTML;
                this.saveImageBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
                this.saveImageBtn.disabled = true;
                
                // Get the calendar container
                const calendarContainer = document.getElementById('calendar-container');
                
                if (!calendarContainer || !window.html2canvas) {
                    throw new Error('Unable to capture calendar image');
                }
                
                // Configure options for better quality
                const options = {
                    backgroundColor: '#ffffff',
                    scale: 2, // Higher resolution
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    windowWidth: calendarContainer.scrollWidth,
                    windowHeight: calendarContainer.scrollHeight,
                    letterRendering: true, // Better text rendering
                    imageTimeout: 0, // No timeout
                    removeContainer: false // Keep container for better rendering
                };
                
                // Generate canvas from the calendar
                const canvas = await html2canvas(calendarContainer, options);
                
                // Convert to blob and download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    
                    // Generate filename with current date
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    link.download = `ubc-schedule-${dateStr}.png`;
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    // Restore button
                    this.saveImageBtn.innerHTML = originalText;
                    this.saveImageBtn.disabled = false;
                    
                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.className = 'save-success';
                    successMsg.textContent = '✅ Image saved successfully!';
                    this.saveImageBtn.parentElement.appendChild(successMsg);
                    
                    setTimeout(() => {
                        successMsg.remove();
                    }, 3000);
                }, 'image/png');
            }
        } catch (error) {
            console.error('Error saving calendar image:', error);
            this.showError('Failed to save calendar image. Please try again.');
            
            // Restore button
            if (this.saveImageBtn) {
                this.saveImageBtn.innerHTML = '<span class="btn-icon">📸</span> Save as Image';
                this.saveImageBtn.disabled = false;
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WorkdayCalendarApp();
});