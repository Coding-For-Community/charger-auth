# ChargerAuth

### REQUIRED: Level Number
After running the server, enter "http://127.0.0.1:8001/oauth/test/levels/" in the browser and set the UPPER_SCHOOL_LEVEL_NUM env variable.

Then, enter "http://127.0.0.1:8001/oauth/test/levels/" in the browser, search for the "Students" role and
set the STUDENTS_ROLE_NUM env variable.

### Setup Frontend
```bash
cd frontend
npm install

### Setup Server
cd ../server
py -m venv .venv 
.venv/Scripts/Activate
pip install -r requirements.txt
py manage.py collectstatic
```
Then, rename the staticfiles folder to just "static".

Finally, do:
```
scripts/resetAdmins.bat
```
(Make sure to have one personal superuser, one superuser for with the Kiosk username and one with the TeacherMonitoredKiosk username)

### How to run: backend
```bash
cd path_to_chargerauth/server
.venv/Scripts/Activate
py main.py
```
Then, create a new terminal and run:
```bash
cd path_to_chargerauth/server
.venv/Scripts/Activate
py manage.py dailyreset
```
Then, create another terminal and run:
```bash
cd path_to_chargerauth/server
py -m http.server 8001 --bind 127.0.0.1
```

### How to run: frontend
```bash
cd ../frontend
npm run dev
```

### How to run: producti