# Checklist de correções - TechNova

## Banco de dados

- [x] SQL colocado dentro de `database/TechNova.sql`.
- [x] SQL cria banco `TechNova`, tabelas e dados iniciais.
- [x] Hashes dos usuários de teste foram refeitos para senhas conhecidas.
- [x] `.env` passou a ter `DB_PORT=3306`.
- [x] `db.js` passou a usar pool de conexão e mensagem de erro mais clara.

## Segurança/autenticação

- [x] `middleware/auth.js` mantém bloqueio por login e perfil.
- [x] Rotas administrativas continuam protegidas por `adminOnly`.
- [x] Rotas de coordenador continuam protegidas por `coordinatorOnly`.
- [x] Rotas de aluno continuam protegidas por `studentOnly`.
- [x] Senha real foi removida do pacote final e substituída por exemplo local.

## OCR/upload

- [x] Upload do aluno aceita somente PDF.
- [x] Arquivos `.jpeg`, `.jpg`, `.png` e outros são bloqueados.
- [x] O front-end avisa antes de enviar arquivo inválido.
- [x] O back-end também valida extensão e MIME type.

## Organização de arquivos

- [x] `criaradmin.js` movido para `scripts/criar-admin.js`.
- [x] SQL movido para `database/TechNova.sql`.
- [x] Arquivos duplicados/testes movidos para `arquivo_antigo/`.
- [x] `node_modules` removido do ZIP final.
- [x] Criado `README_EXECUCAO.md` com comandos de execução.

## Testes sugeridos

- [ ] Ligar MySQL e testar `netstat -ano | findstr :3306`.
- [ ] Importar `database/TechNova.sql`.
- [ ] Rodar `npm install`.
- [ ] Rodar `npm run check`.
- [ ] Rodar `npm start`.
- [ ] Abrir `http://localhost:3000/health`.
- [ ] Testar login admin, coordenador e aluno.
- [ ] Testar upload PDF.
- [ ] Testar tentativa de upload JPEG e confirmar bloqueio.
