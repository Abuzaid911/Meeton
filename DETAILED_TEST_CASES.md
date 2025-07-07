# MeetOn - Detailed Test Cases Specification
## Social Event Planning Mobile Application

**Project:** MeetOn - Social Event Planning Platform  
**Student:** Ahmed Abuzaid  
**Date:** July 2025  
**Version:** 1.0.0  

---

## Test Cases Table

| Test Case ID | Functionality | Input | Expected Output |
|--------------|---------------|-------|-----------------|
| **AUTHENTICATION MODULE** | | | |
| TC001 | User Registration - Valid Data | Email: "john.doe@example.com"<br/>Password: "SecurePass123!"<br/>Name: "John Doe"<br/>Phone: "+1234567890" | Registration successful<br/>User account created<br/>Verification email sent<br/>Navigate to verification screen |
| TC002 | User Registration - Invalid Email | Email: "invalid-email"<br/>Password: "SecurePass123!"<br/>Name: "John Doe"<br/>Phone: "+1234567890" | Error message: "Please enter a valid email address"<br/>Registration form remains visible<br/>User not created |
| TC003 | User Registration - Weak Password | Email: "john.doe@example.com"<br/>Password: "123"<br/>Name: "John Doe"<br/>Phone: "+1234567890" | Error message: "Password must be at least 8 characters with uppercase, lowercase, and number"<br/>Registration blocked |
| TC004 | User Registration - Duplicate Email | Email: "existing@example.com"<br/>Password: "SecurePass123!"<br/>Name: "John Doe"<br/>Phone: "+1234567890" | Error message: "Email already registered"<br/>Suggestion to login instead<br/>Registration blocked |
| TC005 | User Login - Valid Credentials | Email: "john.doe@example.com"<br/>Password: "SecurePass123!" | Login successful<br/>JWT token generated<br/>Navigate to Home screen<br/>User session established |
| TC006 | User Login - Invalid Password | Email: "john.doe@example.com"<br/>Password: "WrongPassword" | Error message: "Invalid email or password"<br/>Login form remains visible<br/>No session created |
| TC007 | User Login - Unregistered Email | Email: "notfound@example.com"<br/>Password: "SecurePass123!" | Error message: "Invalid email or password"<br/>Login form remains visible<br/>No session created |
| TC008 | User Logout | Tap logout button<br/>User currently logged in | Logout successful<br/>JWT token cleared<br/>Navigate to login screen<br/>Session terminated |
| TC009 | Session Timeout | User idle for 30+ minutes<br/>App in background | Automatic logout<br/>Navigate to login screen<br/>Session expired message |
| TC010 | Token Refresh | Valid refresh token<br/>Access token expired | New access token generated<br/>User remains logged in<br/>Seamless experience |
| **EVENT MANAGEMENT MODULE** | | | |
| TC011 | Create Event - Complete Data | Title: "Birthday Party"<br/>Date: "2025-08-15"<br/>Time: "19:00"<br/>Location: "123 Main St"<br/>Description: "Join us for celebration"<br/>Category: "Social"<br/>Privacy: "Public" | Event created successfully<br/>Event ID generated<br/>Event appears in host's events<br/>Success message displayed |
| TC012 | Create Event - Minimum Required | Title: "Quick Meetup"<br/>Date: "2025-08-20"<br/>Time: "18:00"<br/>Location: "Coffee Shop" | Event created successfully<br/>Default values applied<br/>Event visible to host<br/>Basic event card displayed |
| TC013 | Create Event - Past Date | Title: "Past Event"<br/>Date: "2025-06-01"<br/>Time: "19:00"<br/>Location: "Venue" | Error message: "Event date cannot be in the past"<br/>Event not created<br/>Form validation displayed |
| TC014 | Create Event - Empty Title | Title: ""<br/>Date: "2025-08-15"<br/>Time: "19:00"<br/>Location: "Venue" | Error message: "Event title is required"<br/>Create button disabled<br/>Field highlighted in red |
| TC015 | Edit Event - Update Details | Event ID: "evt_123"<br/>New Title: "Updated Party"<br/>New Date: "2025-08-16"<br/>User: Event host | Event updated successfully<br/>Changes reflected immediately<br/>Updated timestamp recorded<br/>Success message shown |
| TC016 | Edit Event - Non-Host User | Event ID: "evt_123"<br/>User: Not event host<br/>Attempt to edit | Error message: "Only event host can edit"<br/>Edit option not visible<br/>Access denied |
| TC017 | Delete Event - Host Permission | Event ID: "evt_123"<br/>User: Event host<br/>Confirm deletion | Event deleted successfully<br/>Event removed from all lists<br/>Attendees notified<br/>Confirmation message |
| TC018 | Delete Event - With Attendees | Event ID: "evt_123"<br/>Attendees: 5 users<br/>Host confirms deletion | Event deleted<br/>Cancellation notifications sent<br/>Attendee RSVPs removed<br/>Event history updated |
| TC019 | View Event Details | Event ID: "evt_123"<br/>User: Authenticated | Event details displayed:<br/>- Title, date, time, location<br/>- Host information<br/>- Attendee list<br/>- RSVP options |
| TC020 | Search Events - Keyword | Search term: "birthday"<br/>Active events exist | List of matching events<br/>Relevant results highlighted<br/>Search filters available<br/>Sort options displayed |
| **RSVP & ATTENDANCE MODULE** | | | |
| TC021 | RSVP Yes to Event | Event ID: "evt_123"<br/>User: Invited friend<br/>Action: Tap "Yes" | RSVP recorded as "YES"<br/>User added to attendee list<br/>Host notified<br/>Calendar event created |
| TC022 | RSVP No to Event | Event ID: "evt_123"<br/>User: Invited friend<br/>Action: Tap "No" | RSVP recorded as "NO"<br/>User not in attendee list<br/>Host notified<br/>Decline reason optional |
| TC023 | RSVP Maybe to Event | Event ID: "evt_123"<br/>User: Invited friend<br/>Action: Tap "Maybe" | RSVP recorded as "MAYBE"<br/>User in tentative list<br/>Host notified<br/>Reminder set |
| TC024 | Change RSVP Status | Event ID: "evt_123"<br/>Current RSVP: "MAYBE"<br/>New RSVP: "YES" | RSVP updated to "YES"<br/>Attendee list updated<br/>Host notified of change<br/>Status change logged |
| TC025 | RSVP to Past Event | Event ID: "evt_past"<br/>Event date: Yesterday<br/>User action: RSVP | Error message: "Cannot RSVP to past events"<br/>RSVP buttons disabled<br/>Event marked as past |
| TC026 | View Attendee List | Event ID: "evt_123"<br/>User: Event attendee<br/>Action: Tap attendees | List displayed:<br/>- Confirmed attendees<br/>- Maybe attendees<br/>- Total count<br/>- Profile pictures |
| **FRIEND MANAGEMENT MODULE** | | | |
| TC027 | Send Friend Request | Target user: "jane.smith@example.com"<br/>Current user: "john.doe@example.com"<br/>Action: Send request | Friend request sent<br/>Notification sent to target<br/>Request appears in sent list<br/>Success message displayed |
| TC028 | Send Duplicate Friend Request | Target user: "jane.smith@example.com"<br/>Existing request: Pending<br/>Action: Send again | Error message: "Friend request already sent"<br/>No duplicate request created<br/>Existing request status shown |
| TC029 | Accept Friend Request | Incoming request from: "john.doe@example.com"<br/>Action: Tap "Accept" | Friendship established<br/>Both users added to friends list<br/>Acceptance notification sent<br/>Request removed from pending |
| TC030 | Decline Friend Request | Incoming request from: "john.doe@example.com"<br/>Action: Tap "Decline" | Request declined<br/>Sender notified<br/>Request removed from list<br/>No friendship created |
| TC031 | Cancel Sent Friend Request | Sent request to: "jane.smith@example.com"<br/>Status: Pending<br/>Action: Cancel | Request cancelled<br/>Removed from recipient's inbox<br/>Removed from sent list<br/>Cancellation logged |
| TC032 | Remove Friend | Existing friend: "jane.smith@example.com"<br/>Action: Remove friend<br/>Confirm action | Friendship removed<br/>Both users removed from lists<br/>Shared events access updated<br/>Confirmation message |
| TC033 | View Friends List | User: Authenticated<br/>Action: Navigate to friends | Friends list displayed:<br/>- All confirmed friends<br/>- Online status indicators<br/>- Search functionality<br/>- Mutual friends count |
| TC034 | View Friend Requests | User: Authenticated<br/>Action: Check requests | Requests displayed:<br/>- Received requests (with actions)<br/>- Sent requests (with status)<br/>- Request timestamps<br/>- User profile previews |
| **NOTIFICATION MODULE** | | | |
| TC035 | Friend Request Notification | Friend request received<br/>App: Foreground/Background | Push notification sent<br/>In-app notification created<br/>Badge count updated<br/>Notification clickable to profile |
| TC036 | Event Invitation Notification | Event invitation received<br/>App state: Any | Push notification sent<br/>Notification stored in database<br/>Badge count incremented<br/>Direct link to event details |
| TC037 | RSVP Change Notification | User changes RSVP<br/>Host should be notified | Host receives notification<br/>Notification includes user name<br/>New RSVP status shown<br/>Timestamp recorded |
| TC038 | Mark Notification as Read | Unread notification exists<br/>Action: Tap notification | Notification marked as read<br/>Badge count decremented<br/>Visual state updated<br/>Read timestamp recorded |
| TC039 | Delete Notification | Notification exists<br/>Action: Swipe to delete | Notification removed<br/>Database record deleted<br/>List updated immediately<br/>Confirmation not required |
| TC040 | Bulk Mark Notifications Read | Multiple unread notifications<br/>Action: "Mark all as read" | All notifications marked read<br/>Badge count set to 0<br/>Visual indicators updated<br/>Bulk operation logged |
| **PROFILE MANAGEMENT MODULE** | | | |
| TC041 | View Own Profile | User: Authenticated<br/>Action: Navigate to profile | Profile displayed:<br/>- Personal information<br/>- Profile picture<br/>- Event statistics<br/>- Edit options available |
| TC042 | Edit Profile Information | Current name: "John Doe"<br/>New name: "John Smith"<br/>New phone: "+9876543210"<br/>Action: Save | Profile updated successfully<br/>Changes reflected immediately<br/>Update timestamp recorded<br/>Success message shown |
| TC043 | Upload Profile Picture | Image file: Valid JPG/PNG<br/>Size: <5MB<br/>Action: Upload | Image uploaded successfully<br/>Profile picture updated<br/>Thumbnail generated<br/>Old image replaced |
| TC044 | Upload Invalid Profile Picture | Image file: Large video file<br/>Size: >10MB<br/>Format: .mp4 | Error message: "Please select a valid image file under 5MB"<br/>Upload rejected<br/>Current picture unchanged |
| TC045 | View Other User Profile | Target user: "jane.smith@example.com"<br/>Privacy: Public profile<br/>Action: View profile | Profile displayed (limited):<br/>- Name and picture<br/>- Mutual friends<br/>- Public events<br/>- Friend request option |
| TC046 | View Private User Profile | Target user: "private.user@example.com"<br/>Privacy: Private profile<br/>Not friends: True | Limited profile displayed:<br/>- Name only<br/>- "Add Friend" option<br/>- Privacy message shown<br/>- No personal details |
| **CALENDAR MODULE** | | | |
| TC047 | View Calendar | User: Authenticated<br/>Month: Current month<br/>Action: Open calendar | Calendar displayed:<br/>- Current month view<br/>- Event indicators (dots)<br/>- Navigation controls<br/>- Today highlighted |
| TC048 | Navigate Calendar Months | Current view: July 2025<br/>Action: Tap next month arrow | Calendar shows August 2025<br/>Event dots updated<br/>Smooth transition<br/>Month header updated |
| TC049 | Select Calendar Date | Date: July 15, 2025<br/>Events exist: 2 events<br/>Action: Tap date | Date selected (highlighted)<br/>Event list shown below<br/>Events for that date displayed<br/>Quick RSVP options |
| TC050 | View Events for Selected Date | Selected date: July 15, 2025<br/>User events: 1 hosting, 1 attending | Events list displayed:<br/>- "Events I'm Hosting" section<br/>- "Events I'm Attending" section<br/>- Event details summary<br/>- Quick actions available |
| **SEARCH MODULE** | | | |
| TC051 | Search Events by Title | Search query: "birthday"<br/>Matching events: 3 events<br/>Action: Execute search | Search results displayed:<br/>- Matching events listed<br/>- Relevance sorted<br/>- Event summaries shown<br/>- Filter options available |
| TC052 | Search Events by Location | Search query: "Downtown"<br/>Location matches: 5 events<br/>Action: Apply location filter | Filtered results shown:<br/>- Events in downtown area<br/>- Map view option<br/>- Distance indicators<br/>- Sort by proximity |
| TC053 | Search Users | Search query: "John"<br/>Matching users: 4 users<br/>Action: Search users | User results displayed:<br/>- Matching user profiles<br/>- Mutual friends shown<br/>- Friend request options<br/>- Profile previews |
| TC054 | Empty Search Results | Search query: "xyzabc123"<br/>Matching results: 0<br/>Action: Execute search | No results message displayed<br/>Search suggestions provided<br/>Clear search option<br/>Browse alternatives offered |
| **IMAGE UPLOAD MODULE** | | | |
| TC055 | Upload Event Header Image | Event: Creating new event<br/>Image: Valid 1920x1080 JPG<br/>Size: 2MB | Image uploaded successfully<br/>Event header updated<br/>Image optimized for display<br/>Upload progress shown |
| TC056 | Upload Multiple Event Photos | Event: Existing event<br/>Photos: 5 JPG files<br/>Total size: 8MB | All photos uploaded<br/>Gallery updated<br/>Thumbnails generated<br/>Upload order preserved |
| TC057 | Upload Oversized Image | Image: 15MB PNG file<br/>Dimensions: 4000x3000<br/>Action: Upload | Image automatically resized<br/>Quality optimized<br/>Upload successful<br/>Size reduction notification |
| TC058 | Upload Invalid File Type | File: .pdf document<br/>Size: 1MB<br/>Action: Upload | Error message: "Please select an image file"<br/>Upload rejected<br/>File type filter applied<br/>Format guidance shown |
| **ERROR HANDLING & EDGE CASES** | | | |
| TC059 | Network Connection Lost | User action: Create event<br/>Network: Disconnected<br/>Data: Form filled | Error message: "No internet connection"<br/>Data preserved locally<br/>Retry option provided<br/>Offline mode indicator |
| TC060 | Server Timeout | User action: Load events<br/>Server response: 30+ seconds<br/>Network: Good | Timeout message displayed<br/>Loading indicator stops<br/>Retry button shown<br/>Error logged |
| TC061 | Invalid JWT Token | Stored token: Expired<br/>User action: API request<br/>Server response: 401 | Automatic token refresh attempted<br/>If refresh fails: Redirect to login<br/>User session message<br/>Login state cleared |
| TC062 | App Force Close Recovery | App state: Creating event<br/>Action: Force close app<br/>Restart: Immediate | App restarts gracefully<br/>Draft data recovered<br/>User session maintained<br/>Recovery notification shown |
| TC063 | Low Storage Space | Device storage: <100MB<br/>Action: Upload image<br/>Image size: 50MB | Storage warning shown<br/>Upload size optimization offered<br/>Alternative options provided<br/>Graceful degradation |
| TC064 | Background App Refresh | App: In background 2+ hours<br/>Action: Return to foreground<br/>Data: Potentially stale | Data refresh initiated<br/>Loading indicators shown<br/>Updated content displayed<br/>Sync status communicated |
| **PERFORMANCE & COMPATIBILITY** | | | |
| TC065 | App Launch Performance | Device: iPhone 14<br/>Storage: Available<br/>Action: Cold start | App launches in <3 seconds<br/>Splash screen shown<br/>Authentication checked<br/>Home screen loaded |
| TC066 | Large Event List Loading | Events count: 100+ events<br/>Network: Good<br/>Action: Load events | Events load progressively<br/>Pagination implemented<br/>Smooth scrolling maintained<br/>Performance remains responsive |
| TC067 | iOS Compatibility | Device: iPhone 12, iOS 16<br/>App version: Latest<br/>Action: Full functionality test | All features work correctly<br/>UI renders properly<br/>Gestures respond normally<br/>No crashes observed |
| TC068 | Android Compatibility | Device: Samsung Galaxy S22<br/>Android version: 13<br/>Action: Full functionality test | All features work correctly<br/>Material design followed<br/>Back button functions properly<br/>Performance satisfactory |
| TC069 | Memory Usage Monitoring | Usage duration: 2 hours<br/>Actions: All app features<br/>Monitoring: Memory consumption | Memory usage stable<br/>No memory leaks detected<br/>App remains responsive<br/>Device performance unaffected |
| TC070 | Battery Usage Testing | Usage duration: 4 hours<br/>Features: All modules active<br/>Monitoring: Battery drain | Battery usage within normal range<br/>No excessive drain<br/>Background usage minimal<br/>Power optimization effective |

---

## Test Execution Summary

### Test Case Statistics
- **Total Test Cases:** 70
- **Authentication:** 10 test cases
- **Event Management:** 10 test cases  
- **RSVP & Attendance:** 6 test cases
- **Friend Management:** 8 test cases
- **Notifications:** 6 test cases
- **Profile Management:** 6 test cases
- **Calendar:** 4 test cases
- **Search:** 4 test cases
- **Image Upload:** 4 test cases
- **Error Handling:** 6 test cases
- **Performance:** 6 test cases

### Priority Distribution
- **High Priority:** 45 test cases (64%)
- **Medium Priority:** 20 test cases (29%)
- **Low Priority:** 5 test cases (7%)

### Test Environment Requirements
- **iOS Device:** iPhone 12 or newer, iOS 16+
- **Android Device:** Samsung Galaxy S20+ or equivalent, Android 11+
- **Network:** WiFi and 4G connectivity required
- **Storage:** Minimum 2GB available space
- **Permissions:** Camera, Photos, Notifications, Location (optional)

---

## Test Execution Guidelines

### Pre-Execution Setup
1. Install latest MeetOn app version
2. Create test user accounts with verified emails
3. Prepare test data (events, user profiles, images)
4. Configure test environment settings
5. Enable developer/debug options if needed

### Execution Process
1. Execute test cases in order by module
2. Record actual results vs expected results
3. Document any deviations or unexpected behavior
4. Capture screenshots for UI-related test cases
5. Report bugs immediately with reproduction steps

### Post-Execution Activities
1. Compile test execution report
2. Calculate pass/fail rates by module
3. Analyze failed test cases and root causes
4. Update test cases based on new findings
5. Prepare recommendations for next iteration

---

**Document Prepared By:** Ahmed Abuzaid  
**Date:** July 2025  
**Version:** 1.0  
**Status:** Ready for Execution 