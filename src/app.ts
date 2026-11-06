import './style.css';

type TipoUsuario = 'Administrador' | 'Usuário Comum';
type StatusReserva = 'Ativa' | 'Cancelada';

export class Recurso {
  constructor(public id: number, public descricao: string) {}
}

export class Sala {
  constructor(
    public id: number,
    public nome: string,
    public capacidade: number,
    public ativa: boolean,
    public recursos: Recurso[] = [],
  ) {}

  consultarRecursos(): Recurso[] { return this.recursos; }
  alterarStatus(ativa: boolean): void { this.ativa = ativa; }
}

export class Usuario {
  constructor(
    public id: number,
    public nome: string,
    public email: string,
    public tipo: TipoUsuario,
  ) {}

  ehAdministrador(): boolean { return this.tipo === 'Administrador'; }
}

export class Administrador extends Usuario {
  constructor(id: number, nome: string, email: string) { super(id, nome, email, 'Administrador'); }
}

export class Reserva {
  constructor(
    public id: number,
    public data: string,
    public horaInicio: string,
    public horaFim: string,
    public status: StatusReserva,
    public usuario: Usuario,
    public sala: Sala,
  ) {}

  estaAtiva(): boolean { return this.status === 'Ativa'; }
}

interface Estado { salas: Sala[]; usuarios: Usuario[]; reservas: Reserva[] }

class ApiClient {
  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const response = await fetch(endpoint, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Não foi possível concluir a operação.');
    return payload as T;
  }

  carregarEstado(): Promise<Estado> { return this.request<Estado>('/api/bootstrap'); }
  criarSala(input: { nome: string; capacidade: number; ativa: boolean; recursos: string[] }): Promise<void> { return this.request<void>('/api/salas', { method: 'POST', body: JSON.stringify(input) }); }
  alterarStatusSala(id: number, ativa: boolean): Promise<void> { return this.request<void>(`/api/salas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ ativa }) }); }
  criarUsuario(input: { nome: string; email: string; tipo: TipoUsuario }): Promise<Usuario> { return this.request<Usuario>('/api/usuarios', { method: 'POST', body: JSON.stringify(input) }); }
  criarReserva(input: { salaId: number; usuarioId: number; data: string; horaInicio: string; horaFim: string }): Promise<Reserva> { return this.request<Reserva>('/api/reservas', { method: 'POST', body: JSON.stringify(input) }); }
  cancelarReserva(id: number): Promise<void> { return this.request<void>(`/api/reservas/${id}/cancelar`, { method: 'PATCH' }); }
}

const api = new ApiClient();
let estado: Estado = { salas: [], usuarios: [], reservas: [] };
let filtroReservas: StatusReserva | 'Todas' = 'Ativa';

function hidratarEstado(dados: Estado): Estado {
  const usuarios = dados.usuarios.map((u) => new Usuario(u.id, u.nome, u.email, u.tipo));
  const salas = dados.salas.map((s) => new Sala(s.id, s.nome, s.capacidade, s.ativa, s.recursos.map((r) => new Recurso(r.id, r.descricao))));
  const reservas = dados.reservas.map((r) => new Reserva(
    r.id,
    r.data,
    r.horaInicio,
    r.horaFim,
    r.status,
    usuarios.find((u) => u.id === r.usuario.id) ?? new Usuario(r.usuario.id, r.usuario.nome, r.usuario.email, r.usuario.tipo),
    salas.find((s) => s.id === r.sala.id) ?? new Sala(r.sala.id, r.sala.nome, r.sala.capacidade, r.sala.ativa),
  ));
  return { salas, usuarios, reservas };
}

async function recarregar(mensagem?: string): Promise<void> {
  estado = hidratarEstado(await api.carregarEstado());
  render();
  if (mensagem) mostrarMensagem(mensagem);
}

function esc(texto: string): string { return texto.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char)); }
function dataBR(data: string): string { return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR'); }
function mostrarMensagem(texto: string, erro = false): void {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = texto;
  if (erro) toast.style.borderLeftColor = '#f04438';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function render(): void {
  const salasAtivas = estado.salas.filter((sala) => sala.ativa).length;
  const reservasAtivas = estado.reservas.filter((reserva) => reserva.status === 'Ativa').length;
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <main class="shell">
      <header class="hero"><div><div class="eyebrow">Gestão inteligente de espaços</div><h1>MeetSync</h1><p>Reserve salas, organize recursos e acompanhe a agenda da sua equipe em um só lugar.</p></div><div class="brand-mark">MS / salas</div></header>
      <section class="stats"><div class="stat"><strong>${salasAtivas}</strong><span>salas disponíveis</span></div><div class="stat"><strong>${estado.salas.length - salasAtivas}</strong><span>salas inativas</span></div><div class="stat"><strong>${reservasAtivas}</strong><span>reservas ativas</span></div><div class="stat"><strong>${estado.usuarios.length}</strong><span>usuários cadastrados</span></div></section>
      <section class="layout">
        <article class="panel"><div class="panel-head"><div><h2>Cadastrar sala</h2><p>Os dados serão salvos no banco pelo backend Node.js.</p></div></div>
          <form id="formSala"><div class="form-grid"><div class="field"><label for="nomeSala">Nome da sala</label><input id="nomeSala" required placeholder="Ex.: Sala Criativa" /></div><div class="field"><label for="capacidade">Capacidade</label><input id="capacidade" type="number" min="1" required placeholder="10" /></div><div class="field full"><label>Recursos</label><div class="checks">${['Projetor','TV','Ar-condicionado'].map((item) => `<label class="check"><input type="checkbox" name="recursos" value="${item}" />${item}</label>`).join('')}</div></div><div class="field full"><label class="check"><input id="ativaSala" type="checkbox" checked /> Sala ativa para reserva</label></div></div><div class="actions"><button class="btn primary" type="submit">Cadastrar sala</button></div></form>
        </article>
        <article class="panel"><div class="panel-head"><div><h2>Cadastrar usuário</h2><p>O registro será criado no banco de dados.</p></div></div>
          <form id="formUsuario"><div class="form-grid"><div class="field full"><label for="nomeUsuario">Nome completo</label><input id="nomeUsuario" required placeholder="Ex.: Ana Souza" /></div><div class="field full"><label for="emailUsuario">E-mail</label><input id="emailUsuario" type="email" required placeholder="ana@empresa.com" /></div><div class="field full"><label for="tipoUsuario">Perfil</label><select id="tipoUsuario"><option>Usuário Comum</option><option>Administrador</option></select></div></div><div class="actions"><button class="btn secondary" type="submit">Cadastrar usuário</button></div></form>
        </article>
        <article class="panel"><div class="panel-head"><div><h2>Salas disponíveis</h2><p>Escolha uma sala ativa e defina o período da reserva.</p></div></div><div id="salas" class="room-list"></div></article>
        <article class="panel"><div class="panel-head"><div><h2>Usuários</h2><p>Pessoas cadastradas no banco do MeetSync.</p></div></div><div id="usuarios" class="user-list"></div></article>
        <article class="panel full"><div class="panel-head"><div><h2>Reservas</h2><p>Cancelamentos preservam o histórico e liberam o horário.</p></div><div class="tabs"><button class="tab ${filtroReservas === 'Ativa' ? 'active' : ''}" data-filtro="Ativa">Ativas</button><button class="tab ${filtroReservas === 'Cancelada' ? 'active' : ''}" data-filtro="Cancelada">Canceladas</button><button class="tab ${filtroReservas === 'Todas' ? 'active' : ''}" data-filtro="Todas">Todas</button></div></div><div id="reservas" class="reservation-list"></div></article>
      </section>
    </main>`;
  renderSalas();
  renderUsuarios();
  renderReservas();
  bindEvents();
}

function renderSalas(): void {
  const alvo = document.querySelector<HTMLDivElement>('#salas')!;
  alvo.innerHTML = estado.salas.map((sala) => `<div class="room-card"><div class="room-top"><div><h3>${esc(sala.nome)}</h3><p>Capacidade para ${sala.capacidade} pessoas</p></div><span class="badge ${sala.ativa ? 'active' : 'cancelled'}">${sala.ativa ? 'Ativa' : 'Inativa'}</span></div><div class="chips">${sala.recursos.length ? sala.recursos.map((r) => `<span class="chip">${esc(r.descricao)}</span>`).join('') : '<span class="chip">Sem recursos informados</span>'}</div><div class="actions"><button class="btn small ${sala.ativa ? 'danger' : 'ghost'}" data-toggle-sala="${sala.id}">${sala.ativa ? 'Inativar' : 'Ativar'} sala</button>${sala.ativa ? `<button class="btn small primary" data-reservar="${sala.id}">Reservar</button>` : ''}</div></div>`).join('') || '<div class="empty">Nenhuma sala cadastrada.</div>';
}

function renderUsuarios(): void {
  const alvo = document.querySelector<HTMLDivElement>('#usuarios')!;
  alvo.innerHTML = estado.usuarios.map((u) => `<div class="reservation-card"><div class="room-top"><div><strong>${esc(u.nome)}</strong><p>${esc(u.email)}</p></div><span class="badge ${u.ehAdministrador() ? 'active' : 'cancelled'}">${u.tipo}</span></div></div>`).join('') || '<div class="empty">Nenhum usuário cadastrado.</div>';
}

function renderReservas(): void {
  const alvo = document.querySelector<HTMLDivElement>('#reservas')!;
  const lista = estado.reservas.filter((r) => filtroReservas === 'Todas' || r.status === filtroReservas);
  alvo.innerHTML = lista.map((r) => `<div class="reservation-card"><div class="reservation-top"><div><strong>${esc(r.sala.nome)}</strong><p>${dataBR(r.data)} · ${r.horaInicio}–${r.horaFim} · ${esc(r.usuario.nome)}</p></div><span class="badge ${r.status === 'Ativa' ? 'active' : 'cancelled'}">${r.status}</span></div>${r.estaAtiva() ? `<div class="actions"><button class="btn small danger" data-cancelar="${r.id}">Cancelar reserva</button></div>` : ''}</div>`).join('') || '<div class="empty">Nenhuma reserva neste filtro.</div>';
}

function abrirReserva(sala: Sala): void {
  const modal = document.createElement('div');
  modal.className = 'toast';
  modal.style.left = '22px';
  modal.style.right = 'auto';
  modal.style.bottom = '22px';
  modal.style.maxWidth = 'min(500px, calc(100vw - 44px))';
  modal.innerHTML = `<strong>Nova reserva: ${esc(sala.nome)}</strong><form id="formReserva" style="margin-top:12px;display:grid;gap:8px"><label>Usuário<select id="resUsuario" required>${estado.usuarios.map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`).join('')}</select></label><label>Data<input id="resData" type="date" required /></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>Início<input id="resInicio" type="time" required /></label><label>Fim<input id="resFim" type="time" required /></label></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn small ghost" type="button" id="fecharReserva">Fechar</button><button class="btn small primary" type="submit">Confirmar</button></div></form>`;
  document.body.appendChild(modal);
  (modal.querySelector('#resData') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
  modal.querySelector('#fecharReserva')!.addEventListener('click', () => modal.remove());
  modal.querySelector('form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.criarReserva({
        salaId: sala.id,
        usuarioId: Number((modal.querySelector('#resUsuario') as HTMLSelectElement).value),
        data: (modal.querySelector('#resData') as HTMLInputElement).value,
        horaInicio: (modal.querySelector('#resInicio') as HTMLInputElement).value,
        horaFim: (modal.querySelector('#resFim') as HTMLInputElement).value,
      });
      modal.remove();
      await recarregar('Reserva criada no banco com sucesso.');
    } catch (error) { mostrarMensagem(error instanceof Error ? error.message : 'Não foi possível criar a reserva.', true); }
  });
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>('#formSala')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.criarSala({
        nome: document.querySelector<HTMLInputElement>('#nomeSala')!.value.trim(),
        capacidade: Number(document.querySelector<HTMLInputElement>('#capacidade')!.value),
        ativa: document.querySelector<HTMLInputElement>('#ativaSala')!.checked,
        recursos: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="recursos"]:checked')).map((input) => input.value),
      });
      await recarregar('Sala cadastrada no banco com sucesso.');
    } catch (error) { mostrarMensagem(error instanceof Error ? error.message : 'Não foi possível cadastrar a sala.', true); }
  });
  document.querySelector<HTMLFormElement>('#formUsuario')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.criarUsuario({ nome: document.querySelector<HTMLInputElement>('#nomeUsuario')!.value.trim(), email: document.querySelector<HTMLInputElement>('#emailUsuario')!.value.trim(), tipo: document.querySelector<HTMLSelectElement>('#tipoUsuario')!.value as TipoUsuario });
      await recarregar('Usuário cadastrado no banco com sucesso.');
    } catch (error) { mostrarMensagem(error instanceof Error ? error.message : 'Não foi possível cadastrar o usuário.', true); }
  });
  document.querySelectorAll<HTMLElement>('[data-reservar]').forEach((button) => button.addEventListener('click', () => { const sala = estado.salas.find((item) => item.id === Number(button.dataset.reservar)); if (sala) abrirReserva(sala); }));
  document.querySelectorAll<HTMLElement>('[data-toggle-sala]').forEach((button) => button.addEventListener('click', async () => { const sala = estado.salas.find((item) => item.id === Number(button.dataset.toggleSala)); if (!sala) return; try { await api.alterarStatusSala(sala.id, !sala.ativa); await recarregar(`Sala ${sala.ativa ? 'inativada' : 'ativada'} com sucesso.`); } catch (error) { mostrarMensagem(error instanceof Error ? error.message : 'Não foi possível alterar a sala.', true); } }));
  document.querySelectorAll<HTMLElement>('[data-cancelar]').forEach((button) => button.addEventListener('click', async () => { try { await api.cancelarReserva(Number(button.dataset.cancelar)); await recarregar('Reserva cancelada e horário liberado.'); } catch (error) { mostrarMensagem(error instanceof Error ? error.message : 'Não foi possível cancelar a reserva.', true); } }));
  document.querySelectorAll<HTMLElement>('[data-filtro]').forEach((button) => button.addEventListener('click', () => { filtroReservas = button.dataset.filtro as StatusReserva | 'Todas'; render(); }));
}

async function iniciar(): Promise<void> {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = '<main class="shell"><section class="panel"><h2>Conectando ao backend MeetSync...</h2><p>Carregando dados do banco de dados.</p></section></main>';
  try { await recarregar(); } catch (error) { document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<main class="shell"><section class="panel"><h2>Não foi possível conectar à API</h2><p>${esc(error instanceof Error ? error.message : 'Verifique o backend Node.js e a conexão com o banco.')}</p></section></main>`; }
}

void iniciar();
