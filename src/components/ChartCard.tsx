import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryPie, VictoryChart, VictoryBar, VictoryAxis, VictoryLine, VictoryArea } from 'victory-native';
import { Card } from './Card';
import { colors, typography, spacing } from '../theme';

const { width } = Dimensions.get('window');
const chartWidth = width - 64;

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'pie' | 'bar' | 'line' | 'area';
  data: any[];
  colorScale?: string[];
}

export function ChartCard({ title, subtitle, type, data, colorScale }: ChartCardProps) {
  const defaultColors = [
    colors.chart.blue,
    colors.chart.purple,
    colors.chart.pink,
    colors.chart.orange,
    colors.chart.green,
    colors.chart.teal,
    colors.chart.cyan,
    colors.chart.indigo,
  ];

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return (
          <VictoryPie
            data={data}
            width={chartWidth}
            height={220}
            colorScale={colorScale || defaultColors}
            innerRadius={60}
            labelRadius={90}
            style={{
              labels: { fill: colors.text.primary, fontSize: 12, fontWeight: '600' },
            }}
            padding={{ top: 20, bottom: 20, left: 40, right: 40 }}
          />
        );
      
      case 'bar':
        return (
          <VictoryChart
            width={chartWidth}
            height={220}
            domainPadding={{ x: 20 }}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
                grid: { stroke: colors.border.light },
              }}
            />
            <VictoryBar
              data={data}
              style={{
                data: { fill: colors.primary[500] },
              }}
              cornerRadius={{ top: 4 }}
            />
          </VictoryChart>
        );
      
      case 'line':
        return (
          <VictoryChart
            width={chartWidth}
            height={220}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
                grid: { stroke: colors.border.light },
              }}
            />
            <VictoryLine
              data={data}
              style={{
                data: { stroke: colors.primary[500], strokeWidth: 3 },
              }}
            />
          </VictoryChart>
        );
      
      case 'area':
        return (
          <VictoryChart
            width={chartWidth}
            height={220}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fill: colors.text.secondary, fontSize: 10 },
                axis: { stroke: colors.border.default },
                grid: { stroke: colors.border.light },
              }}
            />
            <VictoryArea
              data={data}
              style={{
                data: { 
                  fill: colors.primary[200],
                  stroke: colors.primary[500],
                  strokeWidth: 2,
                },
              }}
            />
          </VictoryChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body.small,
    color: colors.text.secondary,
  },
  chartContainer: {
    alignItems: 'center',
  },
});

