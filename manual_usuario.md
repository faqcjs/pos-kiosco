# Manual de Usuario — eKiosco POS

> **Versión**: 2.0 · **Última actualización**: Julio 2026

---

## Tabla de contenidos

1. [Roles de usuario](#1-roles-de-usuario)
2. [Inicio de sesión](#2-inicio-de-sesión)
3. [Caja — Apertura y cierre de turno](#3-caja--apertura-y-cierre-de-turno)
4. [Venta — Cobrar a un cliente](#4-venta--cobrar-a-un-cliente)
5. [Stock — Catálogo e inventario](#5-stock--catálogo-e-inventario)
6. [Proveedores — Recibir mercadería](#6-proveedores--recibir-mercadería)
7. [Fiar / Clientes — Cuentas corrientes](#7-fiar--clientes--cuentas-corrientes)
8. [Panel de Administración — Métricas](#8-panel-de-administración--métricas)
9. [Control de Lotes y Vencimiento (FEFO)](#9-control-de-lotes-y-vencimiento-fefo)
10. [Modo sin conexión (Offline)](#10-modo-sin-conexión-offline)

---

## 1. Roles de usuario

El sistema tiene tres roles con distintos niveles de acceso. El administrador asigna el rol al crear cada cuenta.

| Función | Administrador | Cajero | Repositor |
|---|:---:|:---:|:---:|
| Venta (cobrar) | ✅ | ✅ | ❌ |
| Abrir / cerrar caja | ✅ | ✅ | ❌ |
| Registrar movimientos de caja | ✅ | ✅ | ❌ |
| Registrar pagos a clientes (fiar) | ✅ | ✅ | ❌ |
| Ver / editar stock | ✅ | ✅ | ✅ |
| Agregar / editar productos | ✅ | ✅ | ✅ |
| Quitar stock (botón −) | ✅ | ❌ | ❌ |
| Recibir mercadería de proveedores | ✅ | ✅ | ✅ |
| Pagar proveedores | ✅ | ✅ | ❌ |
| Editar proveedores | ✅ | ❌ | ✅ |
| Eliminar clientes / proveedores | ✅ | ❌ | ❌ |
| Panel de administración | ✅ | ❌ | ❌ |
| Crear / eliminar usuarios | ✅ | ❌ | ❌ |

> **Nota:** Los repositores solo pueden acceder a las secciones **Stock** y **Proveedores**. Si intentan navegar a otra sección, el sistema los redirige automáticamente a Stock.

---

## 2. Inicio de sesión

1. Abrí la aplicación en el navegador.
2. Ingresá tu **usuario** y **contraseña** en los campos correspondientes.
3. Presioná **Iniciar Sesión**.

Si el usuario o contraseña son incorrectos, el sistema muestra el mensaje "Usuario o contraseña incorrectos" en rojo debajo del formulario. Ningún campo se borra automáticamente — revisá lo que escribiste y volvé a intentarlo.

Una vez que iniciás sesión, el sistema te redirige automáticamente:
- **Administrador y Cajero** → sección **Venta**
- **Repositor** → sección **Stock**

---

## 3. Caja — Apertura y cierre de turno

> **Importante:** La sección **Venta** está completamente bloqueada mientras la caja esté cerrada. No se puede registrar ninguna venta sin un turno abierto.

---

### 3.1 Abrir la caja

Cuando entrás a la sección **Caja** y no hay ningún turno activo, ves la pantalla de apertura con el ícono de candado 🔒.

**Pasos:**

1. Navegá a la sección **Caja** desde el menú lateral.
2. Ingresá tu **nombre** en el campo "Nombre del cajero/a" (ej: `Juan`).
3. Ingresá el **monto de efectivo** que hay en la caja al inicio del turno en "Monto de apertura" (podés dejar `0` si no sabés o si empezás sin efectivo).
4. Presioná el botón verde **Abrir caja**.

El sistema registra la hora de apertura y muestra un badge verde pulsante con tu nombre y la hora de inicio: _"Turno abierto por Juan desde 09:15"_.

---

### 3.2 Métricas del turno activo

Una vez abierto el turno, la pantalla de Caja muestra 6 tarjetas con el estado financiero en tiempo real:

| Tarjeta | Qué mide |
|---|---|
| **Apertura** | El efectivo con el que se abrió la caja |
| **Ventas efectivo** | Total acumulado de ventas cobradas en efectivo en este turno |
| **Ventas QR/Trans.** | Total acumulado de ventas cobradas por QR o transferencia |
| **Ingresos** | Suma de movimientos manuales de tipo "Ingreso" registrados en el turno |
| **Egresos** | Suma de movimientos manuales de tipo "Egreso" registrados en el turno |
| **Total teórico** | Saldo estimado en caja = Apertura + Ventas efectivo + Ingresos − Egresos |

---

### 3.3 Registrar un movimiento manual

Usá esta función para registrar entradas o salidas de efectivo que no son ventas: pago de un delivery, retiro de efectivo, compra de insumos, etc.

1. En la card **"Registrar movimiento"**, seleccioná el **Tipo**:
   - **Ingreso (+)**: entra plata a la caja.
   - **Egreso (−)**: sale plata de la caja.
2. Ingresá el **Monto** (debe ser mayor a 0).
3. Ingresá el **Motivo** (ej: `Pago delivery`, `Compra bolsas`). También podés presionar **Enter** para confirmar sin salir del teclado.
4. Presioná **Registrar**.

El movimiento aparece de inmediato en el historial del turno con el ícono correspondiente (flecha verde para ingresos, roja para egresos) y suma o resta del **Total teórico**.

---

### 3.4 Historial del turno

Debajo del formulario de movimientos se muestra el **historial cronológico** del turno activo, ordenado del más reciente al más antiguo. Incluye tanto los movimientos manuales como todas las ventas registradas.

- Las **ventas en efectivo** muestran el ícono del carrito en azul.
- Las **ventas QR/transferencia** muestran el ícono de QR en violeta.
- Las **ventas fiadas** muestran el ícono de libreta en azul.
- Los **ingresos manuales** muestran una flecha verde hacia arriba.
- Los **egresos manuales** muestran una flecha roja hacia abajo.

**Podés hacer clic en cualquier fila de venta** para abrir el **Detalle de Venta**, que muestra:
- Importe total
- Fecha y hora exactas
- Método de pago
- Lista de productos con cantidad y precio unitario
- Efectivo recibido y vuelto dado (solo para ventas en efectivo)
- Nombre del cajero que la registró

---

### 3.5 Cerrar la caja

1. Presioná el botón rojo **Cerrar caja** (esquina superior derecha de la pantalla Caja).
2. Se abre el modal de cierre con:
   - El **Total teórico** calculado (solo lectura).
   - El campo **"Nombre del cajero/a que cierra"** — podés poner un nombre diferente al de apertura si quien cierra es otra persona.
   - El campo **"Monto físico real en caja"** — contá el efectivo y escribí lo que hay.
3. Una vez que ingresás el monto físico, el sistema muestra la **diferencia** automáticamente:
   - **Fondo verde + "$0"**: caja perfecta, sin diferencias.
   - **Fondo amarillo + "+$X"**: sobrante (hay más efectivo que el esperado).
   - **Fondo rojo + "−$X"**: faltante (hay menos efectivo que el esperado).
4. Ingresá el **nombre de quien cierra**.
5. Presioná **Confirmar cierre**.

El sistema registra el turno en el historial y muestra un toast con el resultado:
- `Caja cerrada. Caja perfecta`
- `Caja cerrada. Sobrante $X`
- `Caja cerrada. Faltante $X`

---

### 3.6 Historial de cajas cerradas

Al pie de la pantalla de Caja, si ya hubo turnos anteriores, encontrás la sección **"Cajas cerradas (N)"**. Es un panel colapsable. Presionando el encabezado lo expandís y podés ver, por cada turno histórico:

- Fecha y hora de apertura
- Nombre del cajero de apertura y del cajero de cierre
- Montos de apertura, total teórico y contado
- Badge de resultado: **Perfecta** (verde) / **Sobrante $X** (amarillo) / **Faltante $X** (rojo)

---

## 4. Venta — Cobrar a un cliente

> **Importante:** Si la caja está cerrada, la pantalla de Venta muestra un mensaje bloqueante. Primero debés abrir la caja siguiendo los pasos del capítulo 3.

---

### 4.1 Descripción general de la pantalla

La pantalla de Venta está dividida en dos zonas:

- **Zona izquierda (catálogo):** búsqueda, filtros por categoría, panel de "Monto rápido" y grilla de productos.
- **Zona derecha (carrito):** lista de productos seleccionados, totales y botón para cobrar.

En **celulares y tablets** el carrito está oculto por defecto; se abre con el botón flotante que aparece en la esquina inferior derecha cuando hay al menos un producto en el carrito.

---

### 4.2 Agregar productos al carrito

#### Opción A — Buscar por nombre

Escribí en la barra de búsqueda (lupa) el nombre del producto o parte de él. La grilla se filtra en tiempo real.

#### Opción B — Filtrar por categoría

Deslizá la barra de categorías (debajo de la búsqueda) y presioná el rubro que querés ver (ej: 🍬 Golosinas, 🥤 Bebidas). Solo aparecen los productos de esa categoría.

Cuando no hay búsqueda activa y la categoría es "Todos", la grilla muestra los **24 productos más vendidos** históricamente para facilitar el acceso rápido a lo que más se vende.

#### Opción C — Escanear código de barras

Presioná el ícono de cámara 📷 en la barra de búsqueda (o el FAB verde flotante en celular). Apuntá la cámara al código de barras del producto. Si el código existe en el catálogo, el producto se agrega al carrito automáticamente con un toast de confirmación.

Si el código no existe: aparece el toast "Código no encontrado: [código]".

#### Opción D — Monto rápido (artículos sin código)

Para cobrar artículos que no están cargados en el sistema (servicio de kiosco, fiambre cortado, etc.):

1. En el panel **"Monto rápido"** (en desktop siempre visible; en celular aparece al tocar **"+ Monto"**):
   - Escribí un **detalle** opcional (ej: `Fiambre, café`). Si lo dejás vacío, aparece como "Monto rápido".
   - Ingresá el **precio** en el campo con el símbolo "$".
2. Presioná **Agregar** o la tecla **Enter**.

El ítem se agrega al carrito como una línea especial (sin afectar el stock de ningún producto).

---

### 4.3 Administrar el carrito

Una vez que hay productos en el carrito:

| Acción | Cómo hacerlo |
|---|---|
| Aumentar cantidad | Presionar el botón **[ + ]** al lado del producto |
| Disminuir cantidad | Presionar el botón **[ − ]** (si llega a 0, el ítem se elimina) |
| Eliminar un ítem | Presionar el ícono de papelera 🗑️ en esa fila |

> **Nota:** Si intentás agregar más unidades de las que hay en stock, el sistema muestra un toast de error y no supera el stock disponible.

El panel del carrito muestra el **total acumulado** en tiempo real. En desktop podés colapsar el panel con el botón de la esquina superior derecha (ícono de panel) si querés ver más de la grilla de productos; el total sigue visible en el lateral compactado.

---

### 4.4 Cobrar — Medios de pago

Cuando el carrito está listo, presioná el botón verde **"Cobrar $X"** (o tocás el total flotante en celular).

Se abre el modal de cobro con tres métodos:

---

#### Efectivo

1. Seleccioná la pestaña **💵 Efectivo** (es la predeterminada).
2. Ingresá cuánto **paga el cliente** en el campo "Paga con".
   - Podés usar los botones de billetes sugeridos (ej: $1.000, $5.000) para setear el valor rápidamente.
   - El botón **"Justo"** setea el monto exacto de la venta (sin vuelto).
3. El sistema calcula el **vuelto** automáticamente:
   - Vuelto en **verde** → el monto es suficiente.
   - Vuelto en **rojo** + mensaje "Falta $X" → el monto ingresado no cubre el total. El botón "Confirmar" permanece deshabilitado hasta que el monto sea suficiente.
4. Presioná **Confirmar venta**.

---

#### QR / Transferencia

1. Seleccioná la pestaña **📱 QR / Transf.**
2. El cliente escanea el QR o hace la transferencia por su cuenta.
3. Una vez confirmado el pago por el cliente, presioná **Confirmar venta**.

No es necesario ingresar ningún monto: el sistema registra la venta por el total del carrito.

---

#### Fiado (venta a crédito)

1. Seleccioná la pestaña **📓 Fiado**.
2. **Seleccioná el cliente** en el desplegable "Cliente" — aparecen todos los clientes registrados.
   - Si el cliente no existe todavía, presioná **"Nuevo cliente"**, ingresá su nombre y teléfono (opcional), y el sistema lo crea en el momento.
3. Presioná **Confirmar venta**.

El importe de la venta se suma automáticamente a la cuenta corriente del cliente. Podés ver y gestionar las deudas en la sección **Fiar / Clientes**.

---

### 4.5 Alertas de vencimiento durante la venta

Si un producto tiene **control de lotes** activado y el lote más próximo está próximo a vencer o ya venció, el sistema te avisa:

- **Toast amarillo** al agregar al carrito: _"⚠️ El lote de [producto] vence pronto (N días)."_
- **Toast rojo** al agregar al carrito: _"⚠️ ¡ATENCIÓN! El lote de [producto] está VENCIDO."_
- **Badge en el carrito**: la línea del producto muestra "Vence pronto (N d)" en amarillo o "VENCIDO" en rojo.

Podés igualmente confirmar la venta. La decisión de proceder con un artículo vencido queda bajo tu criterio y la política del comercio.

---

## 5. Stock — Catálogo e inventario

La sección **Stock** tiene dos pestañas principales: **Inventario** y **Lista de Precios**. También incluye acceso rápido para agregar muchos productos consecutivos.

---

### 5.1 Agregar un nuevo producto

#### Método A — Alta individual (con o sin código de barras)

1. Presioná el botón **"+ Nuevo"** en la esquina superior derecha de la pantalla Stock.
2. Se abre el modal **"Código de barras"**:
   - **Opción 1 — Con código**: ingresá o escaneá el código de barras del producto.
     - Si el código ya existe, el sistema incrementa el stock de ese producto automáticamente y te ofrece un botón **"Deshacer"** por si fue un error.
     - Si el código no existe, el sistema lo busca en la base de datos pública **OpenFoodFacts** (muestra un loader de pantalla completa mientras busca). Si encuentra datos (nombre, marca, categoría), los pre-completa en el formulario.
   - **Opción 2 — Sin código**: presioná **"Sin código / Omitir"** para ir directo al formulario en blanco.
3. En el formulario de producto completá:

| Campo | Descripción |
|---|---|
| **Código de barras** | Ya viene completado si escaneaste; podés editarlo o dejarlo vacío |
| **Nombre** | Obligatorio |
| **Categoría** | Seleccioná del listado con íconos |
| **Precio de compra** | Costo unitario (lo que pagás al proveedor) |
| **Precio de venta** | Lo que cobrás al cliente |
| **Ganancia por unidad** | Se calcula automáticamente: aparece en verde (ganancia) o rojo (pérdida) cuando ambos precios son > 0 |
| **Stock inicial** | Cantidad actual en el depósito |
| **Stock mínimo** | Cantidad mínima antes de que se genere una alerta de reposición |
| **U. por bulto** | Cuántas unidades trae un bulto (ej: 12 para una docena). Útil al recibir mercadería. |

4. Presioná **"Agregar producto"**.

---

#### Método B — Carga rápida (para cargar muchos productos seguidos)

La **Carga rápida** es un modo especial optimizado para trabajar con un lector de código de barras externo y cargar muchos productos nuevos en poco tiempo.

1. Presioná el botón **⚡ Carga rápida** en la esquina superior derecha.
2. El sistema te pide que escanees el primer código de barras.
3. Tras el escaneo:
   - Si el código ya existe en el catálogo, aparece una advertencia en amarillo con los datos del producto existente. Podés **volver a escanear** o **agregar igual** si querés duplicarlo.
   - Si el código es nuevo, el sistema consulta OpenFoodFacts y pre-completa los datos disponibles.
4. Completá los campos del formulario (nombre, costo, precio, stock inicial).
5. Presioná **"Guardar y seguir →"** o la tecla **Enter** desde el campo de stock.
6. El sistema guarda el producto, muestra el contador de sesión (_"N producto(s) cargado(s) esta sesión"_) y **abre automáticamente el escáner** para el siguiente producto.

> **Tip:** La **categoría activa** se guarda durante toda la sesión de carga rápida. Configurala una vez en el selector del encabezado y no la tenés que cambiar para cada producto del mismo rubro.

---

### 5.2 Pestaña Inventario — Gestión de stock

La tabla de inventario muestra todos los productos con sus precios de compra y venta, el stock actual y controles para ajustarlo.

**Controles de stock:**

| Control | Acción | Restricción |
|---|---|---|
| Botón **[ − ]** | Resta 1 unidad del stock | Solo administradores |
| Número de stock | Muestra el stock. En naranja/amarillo si está en o por debajo del mínimo | — |
| Botón **[ + ]** | Suma 1 unidad al stock | Todos los roles |

> **Importante:** Para productos con **control de lotes** activado, ambos botones están deshabilitados. El stock solo se puede modificar desde la sección Proveedores (al recibir mercadería) o desde el panel de lotes.

**Panel de alertas de stock bajo:**

Arriba de la tabla (cuando hay productos con stock bajo), aparece un panel amarillo con las alertas agrupadas. Cada alerta es un chip clickeable que abre directamente el formulario de edición del producto. Los productos con stock = 0 aparecen en rojo ("Sin stock"); los que están en o por debajo del mínimo pero > 0 aparecen en amarillo con la cantidad.

**Editar un producto:**

Presioná el ícono de lápiz ✏️ en la fila del producto. Se abre el mismo formulario de alta pero pre-completado. Los campos **Stock** y **Stock mínimo** solo son editables por administradores.

**Eliminar un producto:**

Presioná el ícono de papelera 🗑️. El sistema pide confirmación con el nombre del producto. Esta acción no se puede deshacer.

---

### 5.3 Pestaña Lista de Precios — Edición masiva de precios

Esta vista muestra todos los productos en una tabla editable directamente. Útil para actualizar precios rápidamente sin abrir el formulario de cada producto.

- **Costo**: hacé clic sobre el número y escribí el nuevo valor.
- **Venta**: hacé clic y escribí el nuevo precio.
- **Margen**: se calcula automáticamente. Si la ganancia es positiva aparece en verde (`+$X (N%)`); si es negativa en rojo.
- Los cambios se guardan automáticamente al pasar al siguiente campo (**al hacer clic afuera** o presionar **Tab / Enter**).

**Alertas de precios sin completar:** Si algún producto tiene precio de venta = $0 o sin completar, aparece en el panel de alertas superior con la leyenda **"Sin precio"** en rojo.

---

### 5.4 Escanear para buscar

Tanto en Inventario como en Lista de Precios, podés usar el botón de cámara 📷 al lado de la búsqueda para escanear un código de barras. El sistema busca el producto por ese código y filtra la tabla.

---

## 6. Proveedores — Recibir mercadería

La sección **Proveedores** permite llevar la cuenta corriente con cada distribuidora, registrar las boletas de compra con el detalle de los productos recibidos y registrar los pagos realizados.

---

### 6.1 Agregar un proveedor

1. Presioná **"+ Nuevo proveedor"** en la esquina superior derecha.
2. Completá el formulario:

| Campo | Descripción |
|---|---|
| **Nombre de la Distribuidora** | Obligatorio (ej: `Distribuidora López`) |
| **Rubro / Categoría** | Golosinas, Bebidas, Cigarrillos, etc. |
| **Vendedor / Contacto** | Nombre del representante de ventas (opcional) |
| **Celular (WhatsApp)** | Número para contactar. Si lo cargás, aparece un botón directo a WhatsApp en la tarjeta. |
| **Días de visita** | Seleccioná los días de la semana que pasa el proveedor (Lun / Mar / Mié / Jue / Vie / Sáb / Dom). Podés seleccionar varios. |

3. Presioná **Agregar**.

El sistema abre automáticamente el detalle del nuevo proveedor para que puedas empezar a registrar movimientos.

---

### 6.2 Navegación y filtros de la lista

La lista de proveedores tiene tres herramientas de filtrado:

- **Búsqueda por texto**: filtra por nombre de distribuidora o nombre del vendedor.
- **Tabs de estado**: **Todos** / **Con Deuda** / **Visitan hoy** (prioriza los que pasan este día de la semana).
- **Pills de categoría**: filtra por rubro (Golosinas, Bebidas, Lácteos/Fiambres, etc.).

Las tarjetas de cada proveedor muestran:
- Nombre, rubro y vendedor
- Días de visita programados (o "🚚 ¡Visita hoy!" si es el día actual)
- Botón de WhatsApp directo (si tiene celular cargado)
- Saldo de cuenta corriente: **"Debés: $X"** en rojo si tenés deuda, o **"Al día"** en verde si está saldado.

Las dos tarjetas de resumen al tope muestran:
- **Deuda total**: suma de todas las deudas pendientes con todos los proveedores.
- **Visitas hoy**: cantidad de proveedores que pasan este día de la semana.

---

### 6.3 Recibir mercadería (registrar una boleta de compra)

Este es el flujo principal de la sección. Permite registrar cada entrega con el detalle de los productos y el importe de la boleta.

1. Entrá al **detalle del proveedor** (tocá su tarjeta en la lista).
2. Presioná el botón **"📦 Recibir"**.
3. El sistema abre el asistente de recepción en **2 pasos**.

---

#### Paso 1 — Datos de la boleta

| Campo | Descripción |
|---|---|
| **Número de Boleta** | Opcional. Ej: `0001-0004294`. Útil para cruzar con la factura física. |
| **Monto Total de la Boleta** | **Obligatorio**. El importe total que figura en la factura. |
| **Fecha de Emisión** | Fecha que figura en la boleta (se autocompleta con hoy). |
| **Fecha de Vencimiento** | Fecha de vencimiento de la factura (opcional). |
| **Notas / Observaciones** | Bonificaciones, fletes, comentarios de la entrega, etc. |
| **Pago contado (efectivo)** | Tildá esta casilla si pagaste la mercadería en el momento. El sistema registrará un **egreso en la caja activa** por ese importe. Si no hay caja abierta, se te avisa que no impactará en caja. |

Presioná **"Siguiente"** para avanzar. El botón queda deshabilitado hasta que el monto de la boleta sea mayor a $0.

---

#### Paso 2 — Carga de productos

Tenés dos formas de cargar los artículos recibidos:

**Tab "Del Catálogo":**

1. Escribí el nombre o código del producto en el buscador. Aparece un desplegable con hasta 6 coincidencias mostrando nombre, categoría, código y costo actual.
2. Hacé clic en el producto para agregarlo a la lista.
3. Para cada ítem de la lista podés:
   - Cambiar la **cantidad** (número de bultos o unidades).
   - Cambiar el modo de conteo: **"Caja (x12) ⇄"** (cuenta por bulto) / **"Unidades ⇄"** (cuenta por unidad). El sistema calcula automáticamente las unidades totales según las "U. por bulto" del producto.
   - Ver el **costo total** calculado para ese renglón.
   - Eliminar el renglón con el ícono de papelera.

> **Nota:** Si el producto tiene **control de lotes** activado, antes de agregarlo debés completar el **Código de lote** (ej: `L254`) y la **Fecha de vencimiento**. Ambos campos son obligatorios para ese tipo de producto.

También podés usar el botón de cámara para escanear el código de barras de un producto del catálogo.

**Tab "Fuera de Catálogo":**

Para artículos que no están cargados en el sistema (gastos, fletes, artículos eventuales):
1. Ingresá el **nombre** del artículo (ej: `Flete`).
2. Ingresá el **costo**.
3. Presioná **"Cargar"**.

Los ítems fuera de catálogo no modifican el stock de ningún producto.

---

**Resumen inferior:**

Al pie de la lista de ítems se muestra:
- **Total de la Boleta**: el importe ingresado en el Paso 1.
- **Suma de Ítems**: la suma de los costos de todos los ítems cargados.
- **Diferencia**: la resta entre ambos. Aparece en verde si es cero (sin diferencias) o en rojo si hay una discrepancia.

No es obligatorio que los ítems sumen exactamente el total de la boleta — el sistema te permite confirmar igual. La diferencia queda visible para que puedas detectar errores de carga.

Presioná **"Confirmar"** para finalizar.

El sistema actualiza el stock de todos los productos del catálogo, registra la boleta en la cuenta corriente del proveedor (sumando el importe a la deuda) y, si marcaste "Pago contado", registra el egreso en la caja activa.

---

### 6.4 Registrar un pago al proveedor

1. Entrá al **detalle del proveedor**.
2. Presioná el botón **"💼 Pagar"** (disponible solo si hay deuda pendiente).
3. En el modal de pago:
   - El saldo actual aparece en rojo como referencia.
   - Ingresá el **monto a pagar** (podés usar el link "Pagar todo ($X)" para pagar la deuda completa).
   - Si querés que el pago salga de la caja activa, tildá **"Descontar de caja"**.
4. Presioná **"Confirmar pago"**.

El pago queda registrado en los movimientos del proveedor y reduce la deuda. Si marcaste "Descontar de caja", se genera un egreso automático en el turno actual.

---

### 6.5 Ver el historial de movimientos

En el detalle del proveedor, la sección **"Movimientos"** muestra todas las boletas y pagos ordenados del más reciente al más antiguo.

- Las **boletas** aparecen con el ícono 📦 en rojo y el importe en rojo con prefijo "+".
- Los **pagos** aparecen con el ícono 💼 en verde y el importe en verde con prefijo "−".
- **Hacer clic en una boleta** abre el **Detalle de Factura** con todos los datos: número, fechas, notas, y el desglose de productos comprados.

Podés eliminar movimientos individuales con el ícono de papelera (solo administradores y repositores). El sistema pide confirmación antes de eliminar.

---

## 7. Fiar / Clientes — Cuentas corrientes

La sección **Fiar** permite gestionar las cuentas corrientes de clientes que llevan deuda en el kiosco.

> **Nota:** Las ventas fiadas **se registran desde la pantalla de Venta**, eligiendo el método de pago "Fiado". Esta sección solo sirve para ver el estado de cuenta de cada cliente y registrar cobros.

---

### 7.1 Agregar un cliente

1. Presioná **"+ Nuevo cliente"** en el encabezado.
2. Ingresá el **nombre y apellido** del cliente (obligatorio).
3. Ingresá el **teléfono** (opcional, útil para contactarlo).
4. Presioná **"Agregar cliente"**.

El cliente aparece en la lista ordenado por saldo (los que más deben, primero).

---

### 7.2 Lista de clientes

La pantalla principal muestra todos los clientes con:
- **Nombre** y teléfono (si tiene).
- **Saldo** a la derecha: en rojo si debe dinero, en verde si está al día.
- **"debe"** / **"al día"** como sub-etiqueta.

Al tope aparece la tarjeta **"Deuda total en la calle"**: el importe total sumado de todas las cuentas con saldo positivo.

---

### 7.3 Ver el detalle de un cliente

Presioná la tarjeta de cualquier cliente para ver su ficha completa:

- **Nombre**, teléfono y deuda actual.
- **Historial de movimientos** (más reciente primero):
  - Íconos verdes = pagos recibidos (reducen la deuda, muestran "−$X" en verde).
  - Íconos rojos = ventas fiadas (aumentan la deuda, muestran "+$X" en rojo). El detalle muestra los productos de esa venta.
- Botón **"← Volver a clientes"** para regresar a la lista.

---

### 7.4 Registrar un cobro (el cliente te paga)

1. En el **detalle del cliente**, presioná el botón verde **"Registrar pago"**.
   - Este botón está deshabilitado si el cliente no tiene deuda.
2. En el modal de cobro:
   - Se muestra la **deuda actual** como referencia.
   - El campo de monto se pre-completa con el total de la deuda (pago completo).
   - Podés cambiar el monto a un pago parcial.
   - El link **"Pagar todo ($X)"** resetea el monto al total de la deuda.
3. Verificá que haya una **caja abierta** — el modal te avisa: "✓ El pago ingresa a la caja activa." Si la caja está cerrada, el pago no puede registrarse.
4. Presioná **"Confirmar pago"**.

El pago se descuenta de la deuda del cliente y entra al flujo de la caja activa.

---

### 7.5 Eliminar un cliente

Solo los **administradores** pueden eliminar clientes. En el detalle del cliente aparece el botón **"Eliminar"** (ícono de papelera, borde rojo). El sistema pide confirmación con el aviso de que se borrarán todos los movimientos e historial de ese cliente.

---

## 8. Panel de Administración — Métricas

> **Importante:** Esta sección es **exclusiva para administradores**. Cajeros y repositores no tienen acceso.

El panel tiene dos tabs: **Estadísticas** y **Empleados**.

---

### 8.1 Tab Estadísticas

#### Tarjetas de KPI principales

Al tope hay 6 tarjetas con los indicadores clave del negocio:

| Tarjeta | Qué mide | Período |
|---|---|---|
| **Ventas de hoy** | Total facturado en el día (incluye número de operaciones) | Solo hoy |
| **Ganancia de hoy** | Diferencia entre precio de venta y costo de los productos vendidos hoy | Solo hoy |
| **Ticket Promedio** | Importe promedio de todas las ventas | Histórico total |
| **Margen Promedio** | Porcentaje de ganancia promedio sobre las ventas | Histórico total |
| **Por cobrar (fiado)** | Total de deuda pendiente de todos los clientes activos | Tiempo real |
| **A pagar (prov.)** | Total de deuda pendiente con todos los proveedores | Tiempo real |

---

#### Gráfico de ventas del período (área)

Un gráfico de área doble muestra la evolución de **Ventas** (línea verde) y **Ganancia bruta** (línea amarilla) a lo largo del tiempo.

**Selector de período** (esquina superior derecha del gráfico):

| Botón | Qué muestra |
|---|---|
| **Hoy** | Últimas 24 horas divididas en intervalos de 2 horas |
| **Semana** | Los últimos 7 días (etiquetas con nombre del día) |
| **Mes** | Los últimos 30 días (etiquetas con día y mes) |
| **6 Meses** | Los últimos 6 meses (etiquetas con mes abreviado) |

El badge verde en la esquina del gráfico muestra el **total de ventas para el período seleccionado**.

> **Importante:** Las tarjetas "Ticket Promedio" y "Margen Promedio" son históricas y **no cambian** al mover el selector de período. El selector afecta únicamente al gráfico de área y al badge de total.

---

#### Gráfico de medios de pago (dona)

A la derecha del gráfico de área, un gráfico de dona muestra la distribución histórica de todos los medios de pago utilizados:

- **Efectivo**
- **QR / Transferencia**
- **Fiado**

La leyenda debajo muestra el total acumulado en pesos para cada medio. Es histórico (no se filtra por período).

---

#### Gráfico de ventas por turno de caja (barras verticales)

Muestra los últimos 8 turnos de caja cerrados. Cada barra representa el **total de ventas** de ese turno. El eje X muestra el nombre del cajero y la fecha del turno.

---

#### Últimos cierres de caja

A la derecha del gráfico de turnos, una lista compacta muestra los **5 últimos cierres** con:
- Nombre del cajero
- Fecha del turno
- Total de ventas del turno
- **Diferencia de caja**: `Perfecto` (gris), `+$X` en verde (sobrante), `−$X` en rojo (faltante).

---

#### Productos más vendidos (barras horizontales)

Un gráfico de barras horizontales muestra el **top 5 de productos** por unidades vendidas (histórico).

El botón **"Ver más"** abre el **Modal de Top Productos**:
- Muestra el **top 10** de productos por unidades vendidas.
- Podés filtrar por **categoría** (chips en la parte superior del modal).
- Cada producto muestra su ranking, nombre, categoría, unidades vendidas, ingresos totales y una barra de progreso proporcional al #1.

---

#### Valor de inventario y stock bajo

Dos tarjetas compactas a la derecha del top de productos:

- **Inventario**: valor total del stock actual calculado al **precio de costo** (lo que tenés "congelado" en mercadería).
- **Stock bajo**: lista de hasta 5 productos que están en o por debajo de su stock mínimo. Los que están en 0 aparecen en rojo, los que tienen algo pero están bajos en naranja. Si hay más de 5, se indica "+N más". Si todo está bien, muestra "Todo en orden.".

---

#### Historial de ventas por día

Una lista paginada de todos los días con ventas, mostrando la fecha, cantidad de operaciones y total facturado. Inicialmente muestra 10 días; el botón **"Cargar más días"** agrega 10 más por vez.

**Hacer clic en cualquier día** abre el **Modal de Detalle de Ventas del Día**, que muestra cada transacción de ese día con:
- Hora exacta (formato HH:MM)
- Método de pago (badge con color)
- Total de la venta
- Desglose de cada producto: cantidad, nombre y subtotal

---

#### Últimas ventas

A la derecha del historial, un feed con las **6 ventas más recientes** (de cualquier fecha), mostrando artículos, fecha, método de pago y total.

---

### 8.2 Tab Empleados

#### Rendimiento por turno

Una tabla (desktop) o tarjetas (mobile) que muestra el **rendimiento de cada cajero** agrupado por el nombre que ingresaron al abrir cada turno de caja. Las cuentas del sistema (admin, desarrollo, etc.) están excluidas automáticamente.

| Columna | Descripción |
|---|---|
| **Empleado (Caja)** | Nombre escrito al abrir el turno |
| **Turnos Trab.** | Cantidad de turnos trabajados |
| **Total Ventas** | Suma de todas las ventas en sus turnos |
| **Operaciones** | Cantidad de transacciones individuales |
| **Diferencia Caja** | Suma de los descuadres de sus cierres (verde = sobrante, rojo = faltante) |

**Hacer clic en una fila** abre el **Modal de Detalle del Empleado**, que muestra el historial completo de todas las ventas registradas en sus turnos, con fecha, hora, método de pago y desglose de productos.

---

#### Usuarios registrados

Una tabla con todos los usuarios del sistema (excepto el administrador). Desde aquí podés:

**Crear un usuario nuevo:**
1. Presioná **"+ Nuevo Usuario"**.
2. Completá:
   - **Nombre completo** (ej: `Juan Pérez`)
   - **Usuario** (ej: `juan.empleado`) — el nombre con el que inicia sesión
   - **Contraseña**
   - **Rol**: `Empleado` (tiene acceso a Venta y Caja) o `Repositor` (solo Stock y Proveedores)
3. Presioná **"Registrar Usuario"**.

**Eliminar un usuario:**
Presioná el ícono de papelera 🗑️ en la fila del usuario. El sistema pide confirmación con un diálogo del navegador.

---

## 9. Control de Lotes y Vencimiento (FEFO)

El sistema soporta tracking de mercadería por lotes para productos perecederos (lácteos, fiambres, gaseosas, etc.). La lógica de despacho sigue la regla **FEFO (First Expired, First Out)**: siempre se vende primero el lote que vence más pronto.

---

### 9.1 ¿Qué cambia en un producto con control de lotes?

Una vez que un producto tiene el control de lotes activado:

- El stock global del producto pasa a ser la **suma de todos sus lotes activos** (en lugar de un número plano).
- Los botones **[ + ]** y **[ − ]** de ajuste rápido de stock se deshabilitan para ese producto.
- Todo ingreso de stock debe hacerse a través del flujo de **Recibir mercadería** en Proveedores.

---

### 9.2 Recibir mercadería de un producto con lotes

En el **Paso 2** del asistente de recepción de proveedores, al seleccionar un producto con control de lotes del catálogo, aparecen dos campos adicionales obligatorios:

- **Código de Lote** (texto): el código impreso en el empaque, ej: `L254`, `LOTE-B`.
- **Fecha de Vencimiento**: el selector de calendario con la fecha de vencimiento del lote.

Si alguno de estos campos está vacío al intentar agregar el producto, el sistema muestra un error y no lo agrega a la lista.

---

### 9.3 Ver los lotes activos de un producto

En la pestaña **Inventario** de Stock, los productos bajo control de lotes muestran un botón **"Ver lotes"** al lado del nombre. Al presionarlo:

- **Lotes activos**: muestra los lotes con stock mayor a cero, ordenados por fecha de vencimiento ascendente (el que vence antes, primero). Si algún lote ya venció, se destaca en rojo con la leyenda **"VENCIDO"**.
- **Historial / Vacíos**: muestra los lotes ya agotados (stock = 0).
- **Ajuste manual**: los administradores pueden ajustar el stock de un lote específico con los botones +/−, o agregar un lote manualmente llenando el formulario inferior del panel.

---

### 9.4 Deducción automática FEFO durante la venta

Cuando se confirma una venta con productos de lote, el sistema:

1. Identifica el lote más próximo a vencer (el primero de la lista ordenada).
2. Deduce las unidades vendidas de ese lote primero.
3. Si la cantidad vendida supera el stock de ese lote, consume la totalidad de ese lote y continúa descontando del siguiente lote más próximo a vencer (en cascada).

Este proceso es completamente automático y transparente para el cajero.

---

### 9.5 Alertas en caja

Al agregar al carrito un producto con control de lotes:

| Condición | Alerta visible |
|---|---|
| El lote ya venció | Toast rojo: _"⚠️ ¡ATENCIÓN! El lote de [nombre] está VENCIDO."_ + badge rojo en el carrito |
| El lote vence en ≤ 7 días | Toast amarillo: _"⚠️ El lote de [nombre] vence pronto (N días)."_ + badge amarillo en el carrito |
| El lote tiene stock suficiente y no vence pronto | Sin alerta |

---

## 10. Modo sin conexión (Offline)

El sistema puede operar sin conexión a internet. Cuando la aplicación detecta que no hay red disponible:

- Las operaciones (ventas, recepción de mercadería, pagos, etc.) se guardan **localmente** en el dispositivo.
- Los toasts de confirmación incluyen el sufijo **(Modo Offline)** con tono amarillo de advertencia en lugar del verde habitual.
- Cuando se recupera la conexión, los datos se sincronizan automáticamente con el servidor.

> **Precaución:** Evitá operar en modo offline durante períodos prolongados o en múltiples dispositivos simultáneamente, ya que podrían generarse conflictos de datos al sincronizar.

---

*Fin del manual — eKiosco POS v2.0*
