import type { BvaModel } from '../engine/bva'
import type { CbModel } from '../engine/combinatorial'
import type { DtModel } from '../engine/decisionTable'
import type { EpModel } from '../engine/ep'
import type { StModel } from '../engine/stateTransition'
import type { Lang } from '../engine/types'

export const newId = () => crypto.randomUUID()

export interface Models {
  ep: EpModel
  bva: BvaModel
  dt: DtModel
  st: StModel
  cb: CbModel
}

export function emptyModels(): Models {
  return {
    ep: { title: '', validExpected: '', variables: [] },
    bva: { title: '', variable: '', step: '1', variant: 2, partitions: [] },
    dt: { title: '', conditions: [], actions: [], rules: [] },
    st: { title: '', states: [], events: [], transitions: [], initial: '', criterion: 'transitions' },
    cb: { title: '', params: [], constraints: [], strategy: 'pairwise' },
  }
}

export function exampleModels(lang: Lang): Models {
  const L = (es: string, en: string) => (lang === 'es' ? es : en)
  const yes = L('Sí', 'Yes')
  const no = L('No', 'No')

  return {
    ep: {
      title: L('Cotizador de seguro de auto', 'Car insurance quote'),
      validExpected: L('Se muestra la cotización', 'The quote is shown'),
      variables: [
        {
          id: 'age',
          name: L('Edad del conductor', 'Driver age'),
          partitions: [
            { id: 'age-1', label: L('menor de 18', 'under 18'), valid: false, value: '16', expected: L('Error: el conductor debe ser mayor de edad', 'Error: the driver must be an adult') },
            { id: 'age-2', label: '18–25', valid: true, value: '22', expected: '' },
            { id: 'age-3', label: '26–75', valid: true, value: '45', expected: '' },
            { id: 'age-4', label: L('mayor de 75', 'over 75'), valid: false, value: '80', expected: L('Derivar a cotización manual', 'Refer to manual quote') },
            { id: 'age-5', label: L('no numérica', 'not a number'), valid: false, value: 'abc', expected: L('Error: ingresá un número', 'Error: enter a number') },
          ],
        },
        {
          id: 'use',
          name: L('Uso del vehículo', 'Vehicle use'),
          partitions: [
            { id: 'use-1', label: L('particular', 'private'), valid: true, value: L('Particular', 'Private'), expected: '' },
            { id: 'use-2', label: L('comercial', 'commercial'), valid: true, value: L('Comercial', 'Commercial'), expected: '' },
            { id: 'use-3', label: L('sin seleccionar', 'not selected'), valid: false, value: L('(vacío)', '(empty)'), expected: L('Error: elegí el uso', 'Error: choose the use') },
          ],
        },
        {
          id: 'email',
          name: 'Email',
          partitions: [
            { id: 'em-1', label: L('formato válido', 'valid format'), valid: true, value: 'ana@example.com', expected: '' },
            { id: 'em-2', label: L('sin @', 'missing @'), valid: false, value: 'ana.example.com', expected: L('Error: email inválido', 'Error: invalid email') },
          ],
        },
      ],
    },

    bva: {
      title: L('Tarifa por edad', 'Age-based premium'),
      variable: L('edad', 'age'),
      step: '1',
      variant: 2,
      partitions: [
        { id: 'b1', label: L('menor', 'minor'), min: '0', max: '17', valid: false, expected: L('Rechazar: menor de edad', 'Reject: under age') },
        { id: 'b2', label: L('joven', 'young'), min: '18', max: '25', valid: true, expected: L('Prima joven', 'Young driver premium') },
        { id: 'b3', label: L('estándar', 'standard'), min: '26', max: '64', valid: true, expected: L('Prima estándar', 'Standard premium') },
        { id: 'b4', label: L('senior', 'senior'), min: '65', max: '99', valid: true, expected: L('Prima senior', 'Senior premium') },
      ],
    },

    dt: {
      title: L('Aprobación de préstamos', 'Loan approval'),
      conditions: [
        { id: 'c1', name: L('Cliente registrado', 'Registered customer'), values: [yes, no] },
        { id: 'c2', name: L('Historial crediticio bueno', 'Good credit history'), values: [yes, no] },
        { id: 'c3', name: L('Monto dentro del límite', 'Amount within limit'), values: [yes, no] },
      ],
      actions: [
        { id: 'a1', name: L('Aprobar', 'Approve') },
        { id: 'a2', name: L('Derivar a un analista', 'Refer to an analyst') },
        { id: 'a3', name: L('Rechazar', 'Reject') },
        { id: 'a4', name: L('Ofrecer registro', 'Offer registration') },
      ],
      rules: [
        { id: 'r1', entries: { c1: yes, c2: yes, c3: yes }, actions: ['a1'], feasible: true },
        { id: 'r2', entries: { c1: yes, c2: yes, c3: no }, actions: ['a2'], feasible: true },
        { id: 'r3', entries: { c1: yes, c2: no, c3: '-' }, actions: ['a3'], feasible: true },
        { id: 'r4', entries: { c1: no, c2: '-', c3: '-' }, actions: ['a3', 'a4'], feasible: true },
      ],
    },

    st: {
      title: L('Inicio de sesión con bloqueo', 'Login with lockout'),
      initial: 's0',
      criterion: 'transitions',
      states: [
        { id: 's0', name: L('Pantalla de login', 'Login screen') },
        { id: 's1', name: L('1 intento fallido', '1 failed attempt') },
        { id: 's2', name: L('2 intentos fallidos', '2 failed attempts') },
        { id: 's3', name: L('Cuenta bloqueada', 'Account locked') },
        { id: 's4', name: L('Sesión iniciada', 'Logged in') },
      ],
      events: [
        { id: 'e1', name: L('credenciales válidas', 'valid credentials') },
        { id: 'e2', name: L('credenciales inválidas', 'invalid credentials') },
        { id: 'e3', name: L('desbloquear', 'unlock') },
        { id: 'e4', name: L('cerrar sesión', 'log out') },
      ],
      transitions: [
        { id: 't1', from: 's0', event: 'e1', guard: '', to: 's4', action: '' },
        { id: 't2', from: 's0', event: 'e2', guard: '', to: 's1', action: L('mostrar error', 'show error') },
        { id: 't3', from: 's1', event: 'e1', guard: '', to: 's4', action: '' },
        { id: 't4', from: 's1', event: 'e2', guard: '', to: 's2', action: L('mostrar error', 'show error') },
        { id: 't5', from: 's2', event: 'e1', guard: '', to: 's4', action: '' },
        { id: 't6', from: 's2', event: 'e2', guard: '', to: 's3', action: L('notificar por email', 'email the user') },
        { id: 't7', from: 's3', event: 'e3', guard: L('rol administrador', 'admin role'), to: 's0', action: '' },
        { id: 't8', from: 's4', event: 'e4', guard: '', to: 's0', action: '' },
      ],
    },

    cb: {
      title: L('Compatibilidad del checkout', 'Checkout compatibility'),
      strategy: 'pairwise',
      params: [
        { id: 'p1', name: L('Navegador', 'Browser'), values: ['Chrome', 'Firefox', 'Safari', 'Edge'], base: 0 },
        { id: 'p2', name: L('Sistema operativo', 'Operating system'), values: ['Windows', 'macOS', 'Linux'], base: 0 },
        { id: 'p3', name: L('Idioma', 'Language'), values: [L('Español', 'Spanish'), L('Inglés', 'English')], base: 0 },
        { id: 'p4', name: L('Medio de pago', 'Payment method'), values: [L('Tarjeta', 'Card'), 'PayPal', L('Transferencia', 'Bank transfer')], base: 0 },
      ],
      constraints: [
        { id: 'k1', entries: [{ param: 'p1', value: 'Safari' }, { param: 'p2', value: 'Windows' }] },
        { id: 'k2', entries: [{ param: 'p1', value: 'Safari' }, { param: 'p2', value: 'Linux' }] },
      ],
    },
  }
}
