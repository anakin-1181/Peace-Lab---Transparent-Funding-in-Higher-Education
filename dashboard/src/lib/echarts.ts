import * as echarts from 'echarts/core';
import { BarChart, PieChart, SankeyChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, PieChart, SankeyChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

export { echarts };
