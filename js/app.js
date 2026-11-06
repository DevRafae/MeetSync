"use strict";
class Recurso {
    constructor(id, descricao) {
        this.id = id;
        this.descricao = descricao;
    }
}
class Sala {
    constructor(id, nome, capacidade, ativa, recursos = []) {
        this.id = id;
        this.nome = nome;
        this.capacidade = capacidade;
        this.ativa = ativa;
        this.recursos = recursos;
    }
    consultarRecursos() {
        return this.recursos;
    }
    alterarStatus(ativa) {
        this.ativa = ativa;
    }
}
class Usuario {
    constructor(id, nome, email, tipo) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.tipo = tipo;
    }
}
class Administrador extends Usuario {
    constructor(id, nome, email) {
        super(id, nome, email, 'Administrador');
    }
    cadastrarSala(id, nome, capacidade, recursos, ativa) {
        return new Sala(id, nome, capacidade, ativa, recursos);
    }
}
class Reserva {
    constructor(id, data, horaInicio, horaFim, status, usuario, sala) {
        this.id = id;
        this.data = data;
        this.horaInicio = horaInicio;
        this.horaFim = horaFim;
        this.status = status;
        this.usuario = usuario;
        this.sala = sala;
    }
    cancelar() {
        this.status = 'Cancelada';
    }
    validarConflito(reservas) {
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
const salas = [administrador.cadastrarSala(1, 'Sala Horizonte', 10, [new Recurso(1, 'Projetor'), new Recurso(2, 'TV')], true)];
const usuarios = [administrador];
const reservas = [];
let proximoIdSala = 2;
let proximoIdUsuario = 2;
let proximoIdReserva = 1;
function converterHora(hora) {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
}
function horarioValido(inicio, fim) {
    return Boolean(inicio && fim) && converterHora(fim) > converterHora(inicio);
}
function escapar(texto) {
    return texto.replace(/[&<>'"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[caractere] ?? caractere));
}
function atualizarResumo() {
    document.querySelector('#totalSalas').textContent = String(salas.length);
    document.querySelector('#salasAtivas').textContent = String(salas.filter((sala) => sala.ativa).length);
    document.querySelector('#totalReservas').textContent = String(reservas.length);
    document.querySelector('#totalUsuarios').textContent = String(usuarios.length);
}
function renderizarSalas() {
    const lista = document.querySelector('#salas');
    lista.innerHTML = salas.map((sala) => `
    <div class="room-card">
      <div class="room-top"><div><h3>${escapar(sala.nome)}</h3><p>Capacidade para ${sala.capacidade} pessoas</p></div><span class="badge ${sala.ativa ? 'active' : 'cancelled'}">${sala.ativa ? 'Ativa' : 'Inativa'}</span></div>
      <div class="chips">${sala.recursos.length ? sala.recursos.map((recurso) => `<span class="chip">${escapar(recurso.descricao)}</span>`).join('') : '<span class="chip">Sem recursos</span>'}</div>
      <div class="actions"><button class="btn small ${sala.ativa ? 'danger' : 'ghost'}" data-status="${sala.id}">${sala.ativa ? 'Inativar' : 'Ativar'} sala</button>${sala.ativa ? `<button class="btn small primary" data-reserva="${sala.id}">Reservar</button>` : ''}</div>
    </div>`).join('');
    document.querySelectorAll('[data-status]').forEach((botao) => botao.addEventListener('click', () => {
        const sala = salas.find((item) => item.id === Number(botao.dataset.status));
        if (sala) {
            sala.alterarStatus(!sala.ativa);
            renderizarTudo();
        }
    }));
    document.querySelectorAll('[data-reserva]').forEach((botao) => botao.addEventListener('click', () => abrirFormularioReserva(Number(botao.dataset.reserva))));
}
function renderizarUsuarios() {
    const lista = document.querySelector('#usuarios');
    lista.innerHTML = usuarios.map((usuario) => `<div class="reservation-card"><div class="room-top"><div><strong>${escapar(usuario.nome)}</strong><p>${escapar(usuario.email)}</p></div><span class="badge ${usuario.tipo === 'Administrador' ? 'active' : 'cancelled'}">${usuario.tipo}</span></div></div>`).join('');
}
function renderizarReservas() {
    const lista = document.querySelector('#reservas');
    lista.innerHTML = reservas.map((reserva) => `<div class="reservation-card"><div class="reservation-top"><div><strong>${escapar(reserva.sala.nome)}</strong><p>${reserva.data} · ${reserva.horaInicio}–${reserva.horaFim} · ${escapar(reserva.usuario.nome)}</p></div><span class="badge ${reserva.status === 'Ativa' ? 'active' : 'cancelled'}">${reserva.status}</span></div>${reserva.status === 'Ativa' ? `<div class="actions"><button class="btn small danger" data-cancelar="${reserva.id}">Cancelar reserva</button></div>` : ''}</div>`).join('') || '<div class="empty">Nenhuma reserva criada.</div>';
    document.querySelectorAll('[data-cancelar]').forEach((botao) => botao.addEventListener('click', () => {
        const reserva = reservas.find((item) => item.id === Number(botao.dataset.cancelar));
        if (reserva) {
            reserva.cancelar();
            renderizarTudo();
        }
    }));
}
function abrirFormularioReserva(salaId) {
    const sala = salas.find((item) => item.id === salaId);
    if (!sala)
        return;
    const data = window.prompt('Data da reserva (AAAA-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!data)
        return;
    const inicio = window.prompt('Horário inicial (HH:MM):', '14:00');
    const fim = window.prompt('Horário final (HH:MM):', '15:00');
    if (!inicio || !fim || !horarioValido(inicio, fim)) {
        window.alert('Informe um intervalo de horário válido.');
        return;
    }
    const usuario = usuarios[usuarios.length - 1];
    const reserva = new Reserva(proximoIdReserva++, data, inicio, fim, 'Ativa', usuario, sala);
    if (reserva.validarConflito(reservas)) {
        window.alert('Conflito de horário detectado para esta sala.');
        return;
    }
    reservas.push(reserva);
    renderizarTudo();
}
function renderizarTudo() {
    atualizarResumo();
    renderizarSalas();
    renderizarUsuarios();
    renderizarReservas();
}
document.querySelector('#formSala').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nome = document.querySelector('#nomeSala').value.trim();
    const capacidade = Number(document.querySelector('#capacidade').value);
    const ativa = document.querySelector('#ativaSala').checked;
    const recursos = Array.from(document.querySelectorAll('input[name="recursos"]:checked')).map((input, indice) => new Recurso(indice + 10, input.value));
    const sala = administrador.cadastrarSala(proximoIdSala++, nome, capacidade, recursos, ativa);
    salas.push(sala);
    renderizarTudo();
    evento.target.reset();
    document.querySelector('#ativaSala').checked = true;
});
document.querySelector('#formUsuario').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nome = document.querySelector('#nomeUsuario').value.trim();
    const email = document.querySelector('#emailUsuario').value.trim();
    const tipo = document.querySelector('#tipoUsuario').value;
    usuarios.push(new Usuario(proximoIdUsuario++, nome, email, tipo));
    renderizarTudo();
    evento.target.reset();
});
renderizarTudo();
