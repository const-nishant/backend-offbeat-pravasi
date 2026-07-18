import type { NamingStrategyInterface } from 'typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

// ponytail: single source of column/table naming — camelCase props -> snake_case DB
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return (
      snakeCase(embeddedPrefixes.join('_')) +
      (customName ?? snakeCase(propertyName))
    );
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(relationName + '_' + referencedColumnName);
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return snakeCase(firstTableName + '_' + secondTableName);
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(tableName + '_' + (columnName ?? propertyName));
  }

  foreignKeyName(
    tableOrName: string | { name: string },
    columnNames: string[],
  ): string {
    const tbl =
      typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return snakeCase(`fk_${tbl}_${columnNames.join('_')}`);
  }

  indexName(
    tableOrName: string | { name: string },
    columns: string[],
    _where?: string,
  ): string {
    const tbl =
      typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return snakeCase(`idx_${tbl}_${columns.join('_')}`);
  }
}
