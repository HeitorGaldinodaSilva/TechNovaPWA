# Instruções rápidas - TechNova

1. Abra a pasta `TechNova` no VS Code.
2. Confirme que aparecem `package.json`, `index.js`, `.env` e `database/TechNova.sql`.
3. Rode:

```powershell
npm install
```

4. Abra o `.env` e coloque a senha correta do MySQL:

```powershell
notepad .env
```

5. Importe o banco no MySQL. Para MySQL Server 8.4:

```powershell
cmd /c '"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p < "database\TechNova.sql"'
```

6. Teste se as tabelas entraram:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p -e "USE TechNova; SHOW TABLES;"
```

7. Rode:

```powershell
npm run check
npm start
```

8. Abra:

```txt
http://localhost:3000
http://localhost:3000/health
```
