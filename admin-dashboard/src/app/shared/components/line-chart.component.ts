import { Component, ElementRef, ViewChild, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartOptions, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

export interface LineChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
        tension?: number;
    }[];
}

@Component({
    selector: 'app-line-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="relative" [style.height]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `
})
export class LineChartComponent implements OnInit, OnChanges {
    data = input.required<LineChartData>();
    height = input<string>('300px');

    private chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
    private chart?: Chart;

    constructor() {
        // React to data changes using effect
        effect(() => {
            const chartData = this.data();
            if (this.chart && chartData) {
                this.updateChart(chartData);
            }
        });
    }

    ngOnInit(): void {
        this.initChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && !changes['data'].firstChange && this.chart) {
            this.updateChart(this.data());
        }
    }

    private initChart(): void {
        const canvas = this.chartCanvas().nativeElement;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const chartData = this.data();

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(dataset => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.borderColor || '#6324eb',
                    backgroundColor: dataset.backgroundColor || 'rgba(99, 36, 235, 0.1)',
                    fill: dataset.fill !== undefined ? dataset.fill : true,
                    tension: dataset.tension !== undefined ? dataset.tension : 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            title: (tooltipItems) => {
                                return tooltipItems[0].label;
                            },
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            },
                            padding: 8
                        },
                        border: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart(data: LineChartData): void {
        if (!this.chart) return;

        this.chart.data.labels = data.labels;
        this.chart.data.datasets = data.datasets.map(dataset => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor || '#6324eb',
            backgroundColor: dataset.backgroundColor || 'rgba(99, 36, 235, 0.1)',
            fill: dataset.fill !== undefined ? dataset.fill : true,
            tension: dataset.tension !== undefined ? dataset.tension : 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
        }));

        this.chart.update('none');
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
