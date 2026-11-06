type TipoUsuario = 'Administrador' | 'Usuário Comum';
type StatusReserva = 'Ativa' | 'Cancelada';

class Recurso {
  constructor(public id: number, public descricao: string) {}
}

class Sala {
  constructor(
    public id: number,
    public nome: string,
    public capacidade: number,
    public ativa: boolean,
    public recursos: Recurso[] = [],
  ) {}

  consultarRecursos(): Recurso[] {
    return this.recursos;
  }

  alterarStatus(ativa: boolean): void {
    this.ativa = ativa;
  }
}

class Usuario {
  constructor(
    public id: number,
    public nome: string,
    public email: string,
    public tipo: TipoUsuario,
  ) {}
}

class Administrador extends Usuario {
  constructor(id: number, nome: string, email: string) {
    super(id, nome, email, 'Administrador');
  }

  cadastrarSala(id: number, nome: string, capacidade: number, recursos: Recurso[], ativa: boolean): Sala {
    return new Sala(id, nome, capacidade, ativa, recursos);
  }
}

class Reserva {
  constructor(
    public id: number,
    public data: string,
    public horaInicio: string,
    public horaFim: string,
    public status: StatusReserva,
    public usuario: Usuario,
    public sala: Sala,
  ) {}

  cancelar(): void {
    this.status = 'Cancelada';
  }

  validarConflito(reservas: Reserva[]): boolean {
    const inicio = converterHora(this.horaInicio);
    const fim = converterHora(this.horaFim);

    return reservas.some((reserva) => {
      if (reserva.status !== 'Ativa' || reserva.sala.id !== this.sala.id || reserva.data !== this.data) {
        return false;
      }

      return inicio < converterHora(reserva.horaFim) && fim > converterHora(reserva.horaInicio);
    });
  }
}

const administrador = new Administrador(1, 'Admin MeetSync', 'admin@meetsync.local');
const salas: Sala[] = [administrador.cadastrarSala(1, 'Sala Horizonte', 10, [new Recurso(1, 'Projetor'), new Recurso(2, 'TV')], true)];
const usuarios: Usuario[] = [administrador];
const reservas: Reserva[] = [];
let proximoIdSala = 2;
let proximoIdUsuario = 2;
let proximoIdReserva = 1;

function converterHora(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function horarioValido(inicio: string, fim: string): boolean {
  return Boolean(inicio && fim) && converterHora(fim) > converterHora(inicio);
}

function escapar(texto: string): string {
  return texto.replace(/[&<>'"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[caractere] ?? caractere));
}

function atualizarResumo(): void {
  document.querySelector('#totalSalas')!.textContent = String(salas.length);
  document.querySelector('#salasAtivas')!.textContent = String(salas.filter((sala) => sala.ativa).length);
  document.querySelector('#totalReservas')!.textContent = String(reservas.length);
  document.querySelector('#totalUsuarios')!.textContent = String(usuarios.length);
}

function renderizarSalas(): void {
  const lista = document.querySelector<HTMLDivElement>('#salas')!;
  lista.innerHTML = salas.map((sala) => `
    <div class="room-card">
      <div class="room-top"><div><h3>${escapar(sala.nome)}</h3><p>Capacidade para ${sala.capacidade} pessoas</p></div><span class="badge ${sala.ativa ? 'active' : 'cancelled'}">${sala.ativa ? 'Ativa' : 'Inativa'}</span></div>
      <div class="chips">${sala.recursos.length ? sala.recursos.map((recurso) => `<span class="chip">${escapar(recurso.descricao)}</span>`).join('') : '<span class="chip">Sem recursos</span>'}</div>
      <div class="actions"><button class="btn small ${sala.ativa ? 'danger' : 'ghost'}" data-status="${sala.id}">${sala.ativa ? 'Inativar' : 'Ativar'} sala</button>${sala.ativa ? `<button class="btn small primary" data-reserva="${sala.id}">Reservar</button>` : ''}</div>
    </div>`).join('');

  document.querySelectorAll<HTMLElement>('[data-status]').forEach((botao) => botao.addEventListener('click', () => {
    const sala = salas.find((item) => item.id === Number(botao.dataset.status));
    if (sala) { sala.alterarStatus(!sala.ativa); renderizarTudo(); }
  }));

  document.querySelectorAll<HTMLElement>('[data-reserva]').forEach((botao) => botao.addEventListener('click', () => abrirFormularioReserva(Number(botao.dataset.reserva))));
}

function renderizarUsuarios(): void {
  const lista = document.querySelector<HTMLDivElement>('#usuarios')!;
  lista.innerHTML = usuarios.map((usuario) => `<div class="reservation-card"><div class="room-top"><div><strong>${escapar(usuario.nome)}</strong><p>${escapar(usuario.email)}</p></div><span class="badge ${usuario.tipo === 'Administrador' ? 'active' : 'cancelled'}">${usuario.tipo}</span></div></div>`).join('');
}

function renderizarReservas(): void {
  const lista = document.querySelector<HTMLDivElement>('#reservas')!;
  lista.innerHTML = reservas.map((reserva) => `<div class="reservation-card"><div class="reservation-top"><div><strong>${escapar(reserva.sala.nome)}</strong><p>${reserva.data} · ${reserva.horaInicio}–${reserva.horaFim} · ${escapar(reserva.usuario.nome)}</p></div><span class="badge ${reserva.status === 'Ativa' ? 'active' : 'cancelled'}">${reserva.status}</span></div>${reserva.status === 'Ativa' ? `<div class="actions"><button class="btn small danger" data-cancelar="${reserva.id}">Cancelar reserva</button></div>` : ''}</div>`).join('') || '<div class="empty">Nenhuma reserva criada.</div>';
  document.querySelectorAll<HTMLElement>('[data-cancelar]').forEach((botao) => botao.addEventListener('click', () => {
    const reserva = reservas.find((item) => item.id === Number(botao.dataset.cancelar));
    if (reserva) { reserva.cancelar(); renderizarTudo(); }
  }));
}

function abrirFormularioReserva(salaId: number): void {
  const sala = salas.find((item) => item.id === salaId);
  if (!sala) return;

  const data = window.prompt('Data da reserva (AAAA-MM-DD):', new Date().toISOString().slice(0, 10));
  if (!data) return;
  const inicio = window.prompt('Horário inicial (HH:MM):', '14:00');
  const fim = window.prompt('Horário final (HH:MM):', '15:00');
  if (!inicio || !fim || !horarioValido(inicio, fim)) { window.alert('Informe um intervalo de horário válido.'); return; }

  const usuario = usuarios[usuarios.length - 1];
  const reserva = new Reserva(proximoIdReserva++, data, inicio, fim, 'Ativa', usuario, sala);
  if (reserva.validarConflito(reservas)) { window.alert('Conflito de horário detectado para esta sala.'); return; }
  reservas.push(reserva);
  renderizarTudo();
}

function renderizarTudo(): void {
  atualizarResumo();
  renderizarSalas();
  renderizarUsuarios();
  renderizarReservas();
}

document.querySelector<HTMLFormElement>('#formSala')!.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const nome = document.querySelector<HTMLInputElement>('#nomeSala')!.value.trim();
  const capacidade = Number(document.querySelector<HTMLInputElement>('#capacidade')!.value);
  const ativa = document.querySelector<HTMLInputElement>('#ativaSala')!.checked;
  const recursos = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="recursos"]:checked')).map((input, indice) => new Recurso(indice + 10, input.value));
  const sala = administrador.cadastrarSala(proximoIdSala++, nome, capacidade, recursos, ativa);
  salas.push(sala);
  renderizarTudo();
  (evento.target as HTMLFormElement).reset();
  document.querySelector<HTMLInputElement>('#ativaSala')!.checked = true;
});

document.querySelector<HTMLFormElement>('#formUsuario')!.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const nome = document.querySelector<HTMLInputElement>('#nomeUsuario')!.value.trim();
  const email = document.querySelector<HTMLInputElement>('#emailUsuario')!.value.trim();
  const tipo = document.querySelector<HTMLSelectElement>('#tipoUsuario')!.value as TipoUsuario;
  usuarios.push(new Usuario(proximoIdUsuario++, nome, email, tipo));
  renderizarTudo();
  (evento.target as HTMLFormElement).reset();
});

renderizarTudo();
