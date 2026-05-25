# TechNova - pacote corrigido para teste local

Este pacote já está organizado para rodar o TechNova localmente com Node.js/Express e MySQL.

## Estrutura principal

```txt
TechNova/
├── database/
│   └── TechNova.sql
├── middleware/
│   └── auth.js
├── public/
│   ├── index.html
│   ├── adm.html
│   ├── aluno.html
│   ├── coordenador.html
│   └── arquivos CSS/JS/imagens
├── routes/
│   └── auth.js
├── scripts/
│   ├── criar-admin.js
│   └── testar-banco.js
├── uploads/
├── db.js
├── index.js
├── package.json
├── package-lock.json
├── .env
└── .env.example
```

A pasta `arquivo_antigo/` guarda arquivos antigos/testes para não misturar com a versão principal.

## 1. Entrar na pasta correta

No PowerShell, entre na pasta onde está o `package.json`:

```powershell
cd "CAMINHO_ONDE_VOCE_EXTRAIU\TechNova"
dir
```

O comando `dir` precisa mostrar `package.json`, `index.js`, `db.js`, `.env` e a pasta `database`.

## 2. Instalar dependências

```powershell
npm install
```

## 3. Configurar o `.env`

Abra o arquivo:

```powershell
notepad .env
```

Ajuste conforme o MySQL local:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=TechNova
SESSION_SECRET=troque_esta_chave_em_producao
PORT=3000
```

Se o MySQL local não tiver senha no usuário `root`, deixe:

```env
DB_PASSWORD=
```

Não compartilhe a senha real em prints ou no grupo.

## 4. Confirmar se o MySQL está ativo

```powershell
netstat -ano | findstr :3306
```

Se aparecer `LISTENING`, o MySQL está ativo na porta 3306.

## 5. Importar o banco

O arquivo corrigido do banco já está em:

```txt
database/TechNova.sql
```

### Opção A - MySQL Workbench

1. Abra o MySQL Workbench.
2. Conecte usando o usuário/senha local.
3. Abra o arquivo `database/TechNova.sql`.
4. Execute o script inteiro.

Esse arquivo cria o banco `TechNova`, as tabelas e dados de teste.

### Opção B - PowerShell com MySQL Server 8.4

Use este comando dentro da pasta do projeto:

```powershell
cmd /c '"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p < "database\TechNova.sql"'
```

Digite a senha do MySQL quando pedir.

### Opção C - PowerShell com MySQL Server 8.0

```powershell
cmd /c '"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < "database\TechNova.sql"'
```

### Opção D - XAMPP sem senha no root

```powershell
cmd /c '"C:\xampp\mysql\bin\mysql.exe" -u root < "database\TechNova.sql"'
```

## 6. Conferir se as tabelas foram importadas

Para MySQL Server 8.4:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p -e "USE TechNova; SHOW TABLES;"
```

Se aparecerem tabelas, o banco foi importado corretamente.

## 7. Testar sintaxe do servidor

```powershell
npm run check
```

## 8. Rodar o sistema

```powershell
npm start
```

Abra no navegador:

```txt
http://localhost:3000
```

## 9. Testar servidor e banco

Com o projeto rodando, abra:

```txt
http://localhost:3000/health
```

Resultado esperado:

```json
{
  "servidor": "online",
  "banco": "conectado"
}
```

Se aparecer `banco: erro`, o servidor abriu, mas ainda existe problema de conexão com o MySQL ou com o `.env`.

## 10. Usuários de teste

```txt
Admin:
email: admin@technova.com.br
senha: admin123

Coordenador:
email: coordenador@technova.com.br
senha: coordenador123

Aluno:
email: aluno@technova.com.br
senha: aluno123
```

## 11. Correções aplicadas neste pacote

- Removida a pasta `node_modules` do ZIP.
- Banco incluído em `database/TechNova.sql`.
- SQL corrigido para evitar erro de sintaxe na primeira linha.
- Criado `.env.example`.
- Ajustada conexão do banco para usar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
- Adicionada rota `/health` para teste de servidor e banco.
- Upload/OCR limitado a PDF no front-end e no back-end.
- Arquivos antigos/testes movidos para `arquivo_antigo/`.
- Criado `npm run check` para verificar sintaxe do servidor.

## 12. Erros comuns

### `ENOENT package.json`

Você está na pasta errada. Entre na pasta onde aparece o arquivo `package.json`.

### `ECONNREFUSED 127.0.0.1:3306`

O MySQL está desligado, está em outra porta, ou o `.env` aponta para host/porta errados.

### `ER_ACCESS_DENIED_ERROR`

O MySQL respondeu, mas recusou usuário/senha. Ajuste `DB_USER` e `DB_PASSWORD` no `.env`.

### Pasta `database` vazia

O arquivo SQL não foi copiado. Este pacote já inclui `database/TechNova.sql`.
