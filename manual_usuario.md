# Manual de Usuario: Control de Lotes y Vencimiento (FEFO)

Este sistema introduce un control detallado de inventario por lotes y fechas de vencimiento, diseñado para evitar la venta de productos vencidos y optimizar las existencias priorizando el despacho de los artículos más próximos a vencer (**FEFO: First Expired, First Out**).

---

## 1. Habilitar el Control de Lotes en un Producto

Para realizar el seguimiento por lotes de un producto específico (por ejemplo, lácteos, fiambres o gaseosas):

1. Diríjase a la sección **Stock**.
2. Presione el botón **Editar** (ícono de lápiz) en el producto correspondiente o cree un **Nuevo producto**.
3. En el formulario, active la casilla **Control de Lotes y Vencimiento**.
4. Guarde los cambios.

> [!NOTE]
> Una vez habilitada esta opción, el sistema dejará de administrar un stock global plano para ese producto y pasará a calcularlo automáticamente como la suma de las unidades disponibles en todos sus lotes activos.

---

## 2. Recepción de Mercadería (Ingreso de Lotes)

Cuando reciba mercadería de un proveedor en la sección **Proveedores**:

1. Seleccione el proveedor y presione **Recibir**.
2. Seleccione el producto del catálogo.
3. Si el producto tiene habilitado el *Control de Lotes*, el sistema le solicitará obligatoriamente ingresar:
   - **Código de Lote** (ej: `L254` o el código impreso en el empaque).
   - **Fecha de Vencimiento** (mediante el selector de calendario).
4. Indique la cantidad de bultos/unidades y haga clic en **Cargar**.
5. Finalice el recibo.

El sistema creará o actualizará automáticamente el lote correspondiente e incrementará el inventario global del producto.

---

## 3. Visualización y Ajustes Manuales de Lotes

En la pestaña **Stock**, los productos bajo control de lotes mostrarán un botón **Ver lotes** al lado de su nombre:

- **Lotes Activos**: Muestra los lotes con stock mayor a cero, ordenados por vencimiento. Si un lote ya venció, se destacará en color rojo con la leyenda `VENCIDO`.
- **Historial de Lotes / Vacíos**: Muestra los lotes que se han agotado (stock = 0).
- **Ajuste Manual**: Los administradores pueden ajustar el stock de un lote individualmente con los botones **+** y **-**, o agregar un lote manual directamente completando el formulario inferior.

> [!IMPORTANT]
> Los botones globales de incremento/decremento rápido de stock están deshabilitados para productos con control de lotes para asegurar la consistencia y obligar a que cualquier ajuste se asocie a un lote y fecha de vencimiento específicos.

---

## 4. Proceso de Venta y Deducción FEFO Automática

Durante el proceso de checkout en **Ventas**:

- El cajero agrega los productos de forma habitual.
- El sistema deduce las cantidades de forma automática aplicando la regla **FEFO**: primero se consumirá el stock del lote que venza más pronto.
- Si dos lotes vencen el mismo día, se priorizará el lote cargado primero en el sistema (según la marca de tiempo de creación).
- Si la cantidad vendida supera el stock del primer lote, se consume la totalidad de este y el resto se deduce en cascada del siguiente lote más próximo a vencer.

---

## 5. Alertas de Vencimiento en Caja

Al agregar un artículo al carrito de compras:

1. **Mensaje Flotante (Toast)**: Si el lote a vender está vencido, aparecerá un cartel emergente rojo de advertencia (`⚠️ ¡ATENCIÓN! El lote está VENCIDO`). Si el lote vence dentro de los próximos 7 días, mostrará un aviso informativo amarillo (`⚠️ El lote vence pronto`).
2. **Indicadores en Carrito**: Dentro del detalle de la venta actual, se mostrará una etiqueta indicando si el lote está vencido (`Lote LXXX VENCIDO`) o próximo a expirar (`Vence pronto (X d)`).

El cajero puede proceder con la venta bajo su supervisión, a menos que la política del comercio prohíba estrictamente la facturación de artículos vencidos.
