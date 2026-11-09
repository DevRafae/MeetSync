type TipoUsuario = 'Administrador' | 'Usuário Comum';
type StatusReserva = 'Ativa' | 'Cancelada';

class Recurso {
  constructor(public descricao: string) {}
}

class Sala {
  constructor(public id: number, public nome: string, public capacidade: number, public ativa: boolean, public recursos: Recurso[] = []) {}
  alterarStatus(ativa: boolean): void { this.ativa = ativa; }
}

class Usuario {
  constructor(public id: number, public nome: string, public email: string, public senha: string, public tipo: TipoUsuario) {}
  ehAdministrador(): boolean { return this.tipo === 'Administrador'; }
}

class Reserva {
  constructor(public id: number, public data: string, public horaInicio: string, public horaFim: string, public status: StatusReserva, public usuario: Usuario, public sala: Sala) {}
  cancelar(): void { this.status = 'Cancelada'; }
  temConflito(comparacoes: Reserva[]): boolean {
    const inicio = minutos(this.horaInicio);
    const fim = minutos(this.horaFim);
    return comparacoes.some((reserva) => reserva.status === 'Ativa' && reserva.sala.id === this.sala.id && reserva.data === this.data && inicio < minutos(reserva.horaFim) && fim > minutos(reserva.horaInicio));
  }
}

const usuarios: Usuario[] = [
  new Usuario(1, 'Administrador MeetSync', 'admin@meetsync.com', 'admin123', 'Administrador'),
  new Usuario(2, 'Usuário Demonstração', 'usuario@meetsync.com', 'usuario123', 'Usuário Comum'),
];
const salas: Sala[] = [new Sala(1, 'Sala Horizonte', 10, true, [new Recurso('Projetor'), new Recurso('TV')]), new Sala(2, 'Sala Aurora', 6, true, [new Recurso('Ar-condicionado')])];
const reservas: Reserva[] = [];
let usuarioAtual: Usuario | null = null;
let proximoIdSala = 3;
let proximoIdUsuario = 3;
let proximoIdReserva = 1;

function minutos(hora: string): number { const [h, m] = hora.split(':').map(Number); return h * 60 + m; }
function escapar(texto: string): string { return texto.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] ?? c)); }
function dataBR(data: string): string { return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR'); }
function mostrar(mensagem: string): void { window.alert(mensagem); }

function renderLogin(): void {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<main class="login-shell"><section class="login-card"><div class="eyebrow">Gestão inteligente de espaços</div><h1>MeetSync</h1><p class="login-subtitle">Entre para acessar o sistema de reserva de salas.</p><form id="formLogin"><div class="field"><label for="emailLogin">E-mail</label><input id="emailLogin" type="email" required placeholder="seu@email.com"></div><div class="field"><label for="senhaLogin">Senha</label><input id="senhaLogin" type="password" required placeholder="Sua senha"></div><button class="btn primary full-button" type="submit">Entrar no sistema</button></form><div class="demo-box"><strong>Acessos para demonstração</strong><br>Administrador: admin@meetsync.com / admin123<br>Usuário: usuario@meetsync.com / usuario123</div></section></main>`;
  document.querySelector<HTMLFormElement>('#formLogin')!.addEventListener('submit', (evento) => { evento.preventDefault(); const email = document.querySelector<HTMLInputElement>('#emailLogin')!.value.trim(); const senha = document.querySelector<HTMLInputElement>('#senhaLogin')!.value; const usuario = usuarios.find((item) => item.email === email && item.senha === senha); if (!usuario) { mostrar('E-mail ou senha inválidos.'); return; } usuarioAtual = usuario; renderPainel(); });
}

function renderPainel(): void {
  if (!usuarioAtual) { renderLogin(); return; }
  const admin = usuarioAtual.ehAdministrador();
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<main class="shell"><header class="hero"><div><div class="eyebrow">${admin ? 'Painel administrativo' : 'Área do usuário'}</div><h1>MeetSync</h1><p>Olá, ${escapar(usuarioAtual.nome)}. ${admin ? 'Gerencie salas, usuários e reservas.' : 'Consulte salas disponíveis e faça suas reservas.'}</p></div><div class="header-actions"><span class="role-label">${usuarioAtual.tipo}</span><button class="btn light small" id="sair">Sair</button></div></header><section class="stats"><div class="stat"><strong>${salas.filter((s) => s.ativa).length}</strong><span>salas disponíveis</span></div><div class="stat"><strong>${reservas.filter((r) => r.status === 'Ativa').length}</strong><span>reservas ativas</span></div><div class="stat"><strong>${reservas.filter((r) => r.usuario.id === usuarioAtual!.id).length}</strong><span>minhas reservas</span></div><div class="stat"><strong>${usuarios.length}</strong><span>usuários cadastrados</span></div></section><section class="layout">${admin ? renderAdmin() : renderUsuario()}</section></main>`;
  document.querySelector('#sair')!.addEventListener('click', () => { usuarioAtual = null; renderLogin(); });
  if (admin) bindAdmin(); else bindUsuario();
}

function renderAdmin(): string {
  return `<article class="panel"><div class="panel-head"><div><h2>Cadastrar sala</h2><p>Somente administradores podem alterar a estrutura.</p></div></div><form id="formSala"><div class="form-grid"><div class="field"><label for="nomeSala">Nome da sala</label><input id="nomeSala" required placeholder="Ex.: Sala Criativa"></div><div class="field"><label for="capacidade">Capacidade</label><input id="capacidade" type="number" min="1" required placeholder="10"></div><div class="field full"><label class="check"><input id="ativaSala" type="checkbox" checked> Sala ativa para reservas</label></div><div class="field full"><label>Recursos</label><div class="checks"><label class="check"><input type="checkbox" name="recursos" value="Projetor">Projetor</label><label class="check"><input type="checkbox" name="recursos" value="TV">TV</label><label class="check"><input type="checkbox" name="recursos" value="Ar-condicionado">Ar-condicionado</label></div></div></div><div class="actions"><button class="btn primary" type="submit">Cadastrar sala</button></div></form></article><article class="panel"><div class="panel-head"><div><h2>Cadastrar usuário</h2><p>Crie acessos de administradores ou usuários comuns.</p></div></div><form id="formUsuario"><div class="form-grid"><div class="field full"><label for="nomeUsuario">Nome</label><input id="nomeUsuario" required></div><div class="field full"><label for="emailUsuario">E-mail</label><input id="emailUsuario" type="email" required></div><div class="field full"><label for="senhaUsuario">Senha</label><input id="senhaUsuario" required></div><div class="field full"><label for="tipoUsuario">Perfil</label><select id="tipoUsuario"><option>Usuário Comum</option><option>Administrador</option></select></div></div><div class="actions"><button class="btn secondary" type="submit">Cadastrar usuário</button></div></form></article><article class="panel"><div class="panel-head"><div><h2>Salas e permissões</h2><p>Ative ou inative salas para os usuários.</p></div></div><div id="salas" class="room-list"></div></article><article class="panel"><div class="panel-head"><div><h2>Usuários cadastrados</h2></div></div><div id="usuarios" class="user-list"></div></article><article class="panel full"><div class="panel-head"><div><h2>Todas as reservas</h2><p>Visão administrativa do sistema.</p></div></div><div id="reservas" class="reservation-list"></div></article>`;
}

function renderUsuario(): string {
  return `<article class="panel full"><div class="panel-head"><div><h2>Salas disponíveis</h2><p>Você pode reservar somente salas ativas.</p></div></div><div id="salas" class="room-list room-grid"></div></article><article class="panel full"><div class="panel-head"><div><h2>Minhas reservas</h2><p>Consulte ou cancele seus próprios agendamentos.</p></div></div><div id="reservas" class="reservation-list"></div></article>`;
}

function renderSalas(): void {
  const lista = document.querySelector<HTMLDivElement>('#salas');
  if (!lista) return;
  const visiveis = usuarioAtual?.ehAdministrador() ? salas : salas.filter((sala) => sala.ativa);
  lista.innerHTML = visiveis.map((sala) => `<div class="room-card"><div class="room-top"><div><h3>${escapar(sala.nome)}</h3><p>Capacidade para ${sala.capacidade} pessoas</p></div><span class="badge ${sala.ativa ? 'active' : 'cancelled'}">${sala.ativa ? 'Ativa' : 'Inativa'}</span></div><div class="chips">${sala.recursos.map((r) => `<span class="chip">${escapar(r.descricao)}</span>`).join('') || '<span class="chip">Sem recursos</span>'}</div><div class="actions">${usuarioAtual?.ehAdministrador() ? `<button class="btn small ${sala.ativa ? 'danger' : 'ghost'}" data-toggle="${sala.id}">${sala.ativa ? 'Inativar' : 'Ativar'} sala</button>` : `<button class="btn small primary" data-reservar="${sala.id}">Reservar</button>`}</div></div>`).join('') || '<div class="empty">Nenhuma sala disponível.</div>';
  document.querySelectorAll<HTMLElement>('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const s = salas.find((item) => item.id === Number(b.dataset.toggle)); if (s) { s.alterarStatus(!s.ativa); renderPainel(); } }));
  document.querySelectorAll<HTMLElement>('[data-reservar]').forEach((b) => b.addEventListener('click', () => criarReserva(Number(b.dataset.reservar))));
}

function renderUsuarios(): void { const lista = document.querySelector<HTMLDivElement>('#usuarios'); if (lista) lista.innerHTML = usuarios.map((u) => `<div class="reservation-card"><div class="room-top"><div><strong>${escapar(u.nome)}</strong><p>${escapar(u.email)}</p></div><span class="badge ${u.ehAdministrador() ? 'active' : 'cancelled'}">${u.tipo}</span></div></div>`).join(''); }
function renderReservas(): void { const lista = document.querySelector<HTMLDivElement>('#reservas'); if (!lista || !usuarioAtual) return; const visiveis = usuarioAtual.ehAdministrador() ? reservas : reservas.filter((r) => r.usuario.id === usuarioAtual!.id); lista.innerHTML = visiveis.map((r) => `<div class="reservation-card"><div class="reservation-top"><div><strong>${escapar(r.sala.nome)}</strong><p>${dataBR(r.data)} · ${r.horaInicio}–${r.horaFim} · ${escapar(r.usuario.nome)}</p></div><span class="badge ${r.status === 'Ativa' ? 'active' : 'cancelled'}">${r.status}</span></div>${r.status === 'Ativa' ? `<div class="actions"><button class="btn small danger" data-cancelar="${r.id}">Cancelar reserva</button></div>` : ''}</div>`).join('') || '<div class="empty">Nenhuma reserva encontrada.</div>'; document.querySelectorAll<HTMLElement>('[data-cancelar]').forEach((b) => b.addEventListener('click', () => { const r = reservas.find((item) => item.id === Number(b.dataset.cancelar)); if (r) { r.cancelar(); renderPainel(); } })); }
function renderTudo(): void { renderSalas(); renderUsuarios(); renderReservas(); }

function criarReserva(salaId: number): void { const sala = salas.find((s) => s.id === salaId); if (!sala || !usuarioAtual) return; const data = window.prompt('Data da reserva (AAAA-MM-DD):', new Date().toISOString().slice(0, 10)); const inicio = window.prompt('Horário inicial (HH:MM):', '14:00'); const fim = window.prompt('Horário final (HH:MM):', '15:00'); if (!data || !inicio || !fim || minutos(fim) <= minutos(inicio)) { mostrar('Informe uma data e um horário válido.'); return; } const reserva = new Reserva(proximoIdReserva++, data, inicio, fim, 'Ativa', usuarioAtual, sala); if (reserva.temConflito(reservas)) { mostrar('Conflito de horário: esta sala já está reservada nesse período.'); return; } reservas.push(reserva); renderPainel(); }
function bindAdmin(): void { document.querySelector<HTMLFormElement>('#formSala')?.addEventListener('submit', (e) => { e.preventDefault(); const nome = document.querySelector<HTMLInputElement>('#nomeSala')!.value.trim(); const capacidade = Number(document.querySelector<HTMLInputElement>('#capacidade')!.value); const recursos = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="recursos"]:checked')).map((input) => new Recurso(input.value)); const ativa = document.querySelector<HTMLInputElement>('#ativaSala')!.checked; salas.push(new Sala(proximoIdSala++, nome, capacidade, ativa, recursos)); renderPainel(); }); document.querySelector<HTMLFormElement>('#formUsuario')?.addEventListener('submit', (e) => { e.preventDefault(); usuarios.push(new Usuario(proximoIdUsuario++, document.querySelector<HTMLInputElement>('#nomeUsuario')!.value.trim(), document.querySelector<HTMLInputElement>('#emailUsuario')!.value.trim(), document.querySelector<HTMLInputElement>('#senhaUsuario')!.value, document.querySelector<HTMLSelectElement>('#tipoUsuario')!.value as TipoUsuario)); renderPainel(); }); renderTudo(); }
function bindUsuario(): void { renderTudo(); }

renderLogin();
