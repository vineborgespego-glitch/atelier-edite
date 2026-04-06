import { Order, OrderItem } from '@prisma/client';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOrder(
  order: Partial<Order>,
  items: Partial<OrderItem>[]
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Minimum info
  if (!items || items.length === 0) {
    errors.push('O pedido deve conter pelo menos um item.');
  }

  // Items validation
  items.forEach((item, index) => {
    if (!item.description || item.description.trim() === '') {
      errors.push(`O item da linha ${index + 1} não possui descrição.`);
    }
    if (item.unitPrice === undefined || Number(item.unitPrice) <= 0) {
      errors.push(`O item da linha ${index + 1} possui preço inválido ou zerado.`);
    }
  });

  // Deadline validation (min 3 days from today for regular orders)
  if (order.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(order.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      errors.push('O prazo de entrega não pode estar no passado.');
    } else if (diffDays < 3) {
      warnings.push('Atenção: Prazo de entrega muito curto (menos de 3 dias).');
    }
  } else {
    errors.push('O prazo de entrega é obrigatório.');
  }

  // Value validations
  const calculatedTotal = items.reduce(
    (acc, item) => acc + Number(item.quantity || 1) * Number(item.unitPrice || 0),
    0
  );

  if (Number(order.totalAmount || 0) !== calculatedTotal) {
    warnings.push(
      `O valor total do pedido não bate com a soma dos itens. Esperado: ${calculatedTotal}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
