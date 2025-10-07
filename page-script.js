// Page script that runs in the page context to access Highcharts

(function() {
  'use strict';

  let isBarRaceMode = false;
  let originalChartConfig = null;
  let isPaused = false;
  let currentChart = null;
  let currentBarRaceData = null;
  let currentDateLabel = null;
  let currentDateIndex = 0;

  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'TOGGLE_BAR_RACE') {
      const chartId = extractChartId();
      if (!chartId) {
        window.postMessage({ type: 'BAR_RACE_ERROR', message: 'Could not find chart ID' }, '*');
        return;
      }

      if (!isBarRaceMode) {
        await enableBarRace(chartId);
      } else {
        restoreOriginalChart();
      }
    } else if (event.data.type === 'PLAY_PAUSE_BAR_RACE') {
      togglePlayPause();
    } else if (event.data.type === 'SEEK_BAR_RACE') {
      seekToIndex(event.data.index);
    }
  });

  function extractChartId() {
    // Try to match /charts/{id} pattern
    let match = window.location.pathname.match(/\/charts\/(\d+)/);
    if (match) return match[1];

    // Try to match /collections/{id}/{slug}/{chartId}/ pattern
    match = window.location.pathname.match(/\/collections\/\d+\/[^\/]+\/(\d+)/);
    return match ? match[1] : null;
  }

  async function enableBarRace(chartId) {
    try {
      if (typeof Highcharts === 'undefined') {
        throw new Error('Highcharts is not defined');
      }

      // Fetch the chart data
      const response = await fetch(`https://www.macromicro.me/charts/data/${chartId}`);
      const data = await response.json();

      const chartKey = `c:${chartId}`;
      const chartData = data.data[chartKey];

      if (!chartData) {
        throw new Error('Could not load chart data');
      }

      // Transform data to bar race format
      const barRaceData = transformToBarRace(chartData);

      // Find the Highcharts instance
      const chartContainer = document.querySelector('[data-highcharts-chart]');
      if (!chartContainer) {
        throw new Error('Could not find chart container');
      }

      const chartIndex = chartContainer.getAttribute('data-highcharts-chart');
      const chart = Highcharts.charts[chartIndex];

      if (!chart) {
        throw new Error('Could not access Highcharts instance');
      }

      // Store original config
      originalChartConfig = {
        options: chart.options,
        series: chart.series.map(s => ({
          data: s.data.map(p => [p.x, p.y]),
          name: s.name
        }))
      };

      // Get initial data
      const initialData = getDataForDate(barRaceData, barRaceData.dates[0]);

      console.log('Bar race initial data:', initialData);
      console.log('Bar race data structure:', barRaceData);

      // Destroy existing chart and recreate
      const container = chartContainer;
      chart.destroy();

      // Create new bar race chart
      const newChart = Highcharts.chart(container, {
        chart: {
          type: 'bar',
          animation: {
            duration: 500
          },
          marginRight: 200
        },
        title: originalChartConfig.options.title,
        subtitle: originalChartConfig.options.subtitle,
        xAxis: {
          type: 'category',
          visible: true
        },
        yAxis: {
          opposite: true,
          tickPixelInterval: 150,
          title: {
            text: null
          },
          visible: true
        },
        legend: {
          enabled: false
        },
        plotOptions: {
          series: {
            animation: false,
            groupPadding: 0,
            pointPadding: 0.1,
            borderWidth: 0,
            colorByPoint: true,
            dataSorting: {
              enabled: true,
              matchByName: true
            },
            dataLabels: {
              enabled: true,
              align: 'right',
              format: '{point.y:.1f}'
            }
          }
        },
        series: [{
          type: 'bar',
          name: 'Companies',
          data: initialData,
          dataSorting: {
            enabled: true,
            matchByName: true
          },
          colorByPoint: true
        }]
      });

      // Add date label
      const dateLabel = newChart.renderer.text(
        barRaceData.dates[0],
        newChart.plotLeft + newChart.plotWidth - 150,
        newChart.plotTop + newChart.plotHeight / 2,
        true
      )
      .css({
        fontSize: '60px',
        color: '#ccc',
        fontWeight: 'bold'
      })
      .attr({
        zIndex: 3
      })
      .add();

      // Store references for controls
      currentChart = newChart;
      currentBarRaceData = barRaceData;
      currentDateLabel = dateLabel;
      currentDateIndex = 0;
      isPaused = false;

      // Start animation with the new chart
      animateBarRace(newChart, barRaceData, dateLabel);
      isBarRaceMode = true;

      window.postMessage({
        type: 'BAR_RACE_ENABLED',
        totalDates: barRaceData.dates.length
      }, '*');

    } catch (error) {
      console.error('Error enabling bar race:', error);
      window.postMessage({ type: 'BAR_RACE_ERROR', message: error.message }, '*');
    }
  }

  function transformToBarRace(chartData) {
    const config = chartData.info.chart_config;
    const seriesData = chartData.series;

    const names = [];
    const colors = [];
    const sequences = [];

    config.seriesConfigs.forEach((seriesConfig, idx) => {
      const name = seriesConfig.name_en || seriesConfig.name_tc;
      const color = seriesConfig.color;
      const data = seriesData[idx];

      names.push(name);
      colors.push(color);

      const sequence = data.map(point => ({
        y: parseFloat(point[1]),
        date: point[0]
      }));

      sequences.push(sequence);
    });

    // Get all unique dates
    const allDates = new Set();
    sequences.forEach(seq => {
      seq.forEach(point => allDates.add(point.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return {
      names,
      colors,
      sequences,
      dates: sortedDates
    };
  }

  function getDataForDate(barRaceData, date) {
    const data = barRaceData.names.map((name, idx) => {
      const sequence = barRaceData.sequences[idx];
      const dataPoint = sequence.filter(p => p.date <= date).pop();

      console.log(`Company ${name}: found data point`, dataPoint, 'for date', date);

      return {
        name: name,
        y: dataPoint ? dataPoint.y : 0,
        color: barRaceData.colors[idx]
      };
    });

    data.sort((a, b) => b.y - a.y); // Sort by value descending

    // Return array format for Highcharts with colors preserved
    const result = data.map(d => ({
      name: d.name,
      y: d.y,
      color: d.color
    }));

    console.log('Formatted data for chart:', result);
    return result;
  }

  let animationInterval = null;

  function animateBarRace(chart, barRaceData, dateLabel) {
    // Clear any existing interval
    if (animationInterval) {
      clearInterval(animationInterval);
    }

    animationInterval = setInterval(() => {
      if (isPaused || currentDateIndex >= barRaceData.dates.length || !isBarRaceMode) {
        if (currentDateIndex >= barRaceData.dates.length) {
          clearInterval(animationInterval);
          animationInterval = null;
          isPaused = true;
          window.postMessage({ type: 'BAR_RACE_PAUSED' }, '*');
        }
        return;
      }

      updateChartToIndex(currentDateIndex);
      currentDateIndex++;

      // Send progress update
      window.postMessage({
        type: 'BAR_RACE_PROGRESS',
        index: currentDateIndex
      }, '*');
    }, 200); // 200ms per frame
  }

  function updateChartToIndex(index) {
    if (!currentChart || !currentBarRaceData || !currentDateLabel) return;

    const currentDate = currentBarRaceData.dates[index];

    // Update date label
    currentDateLabel.attr({
      text: currentDate
    });

    // Build new data array with latest values for each company
    const newData = getDataForDate(currentBarRaceData, currentDate);

    // Update the single series with new data
    if (currentChart.series[0]) {
      currentChart.series[0].setData(newData, true);
    }
  }

  function togglePlayPause() {
    if (!isBarRaceMode) return;

    isPaused = !isPaused;

    if (!isPaused) {
      // Resume animation
      if (currentDateIndex >= currentBarRaceData.dates.length) {
        // Restart from beginning
        currentDateIndex = 0;
      }
      animateBarRace(currentChart, currentBarRaceData, currentDateLabel);
      window.postMessage({ type: 'BAR_RACE_PLAYING' }, '*');
    } else {
      window.postMessage({ type: 'BAR_RACE_PAUSED' }, '*');
    }
  }

  function seekToIndex(index) {
    if (!isBarRaceMode || !currentBarRaceData) return;

    currentDateIndex = Math.max(0, Math.min(index, currentBarRaceData.dates.length - 1));
    updateChartToIndex(currentDateIndex);

    // Send progress update
    window.postMessage({
      type: 'BAR_RACE_PROGRESS',
      index: currentDateIndex
    }, '*');
  }

  function restoreOriginalChart() {
    // Stop animation
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    isBarRaceMode = false;
    isPaused = false;
    currentChart = null;
    currentBarRaceData = null;
    currentDateLabel = null;
    currentDateIndex = 0;

    // Simply reload the page to restore original chart
    window.location.reload();
  }

})();
