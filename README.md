# ChargerAuth

### TODO
- Senior Priveleges

### Setup
```bash
cd frontend
npm install

cd ../server
py -m venv .venv 
.venv/Scripts/Activate
pip install -r requirements.txt
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
py manage.py dailyreset
```

### How to run: frontend
```bash
cd ../frontend
npm run dev
```

### How to run: production
To run things for production, just add the ```-prod``` flag to all server commands, and ```npm run deploy``` to deploy to github pages.
In addition, make sure to create a superuser account with ```py manage.py createsuperuser -prod```.