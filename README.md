# ChargerAuth

### TODO!!!!!!
- All students that checked in - add this too!!!!!
- Only use "US Academic Schedule" for shenanigans

### Setup
```bash
cd frontend
npm install

cd ../server
py -m venv .venv 
.venv/Scripts/Activate
pip install requirements.txt
py manage.py collectstatic
```

### How to run: backend
```bash
cd ../server
.venv/Scripts/Activate
py main.py
```
Then, create a new terminal and run
```bash
cd ../server
.venv/Scripts/Activate
py manage.py startdailyreset
```

### How to run: frontend
```bash
cd ../frontend
npm run dev
```