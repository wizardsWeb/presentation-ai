/**
 * Test script for chart generation routes
 * Tests that charts are generated approximately 1 in 10 slides using agent mode logic
 * 
 * Usage:
 *   1. Temporarily disable auth in generate-realtime route (for testing)
 *   2. Start server: npm run dev
 *   3. Run: node tests/test-chart-generation.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/presentation/generate-realtime';

const testData = {
    outline: [
        "Market Growth Statistics",           // Should have chart (data keyword + position)
        "Introduction to AI",                 // No chart
        "Revenue Trends 2020-2024",          // Should have chart (data keyword)
        "Key Features Overview",              // No chart
        "User Adoption Metrics",              // Should have chart (data keyword)
        "Competitive Analysis",               // No chart
        "Technology Stack",                   // No chart
        "Performance Benchmarks",             // Should have chart (data keyword + middle)
        "Customer Satisfaction Survey",       // Should have chart (data keyword)
        "Future Projections"                  // No chart
    ],
    language: "en-US",
    tone: "professional"
};

console.log('🧪 Testing Chart Generation with Agent Mode Control\n');
console.log('='.repeat(60));
console.log(`📡 Endpoint: ${API_URL}`);
console.log(`📊 Testing ${testData.outline.length} slides\n`);

async function testRoute() {
    try {
        console.log('📤 Sending request...\n');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error Response:');
            console.error(`   Status: ${response.status} ${response.statusText}`);
            console.error(`   Body: ${errorText}`);

            if (response.status === 401) {
                console.error('\n💡 Auth Error - To test:');
                console.error('   1. Open: src/app/api/presentation/generate-realtime/route.ts');
                console.error('   2. Temporarily comment out the auth check (lines 63-66)');
                console.error('   3. Save and restart your dev server');
            }
            return;
        }

        console.log('✅ Connected! Streaming response...\n');
        console.log('-'.repeat(60));

        if (!response.body) {
          throw new Error('Response body is null');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let slidesWithCharts = [];
        let totalSlides = 0;
        let chartsFound = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.log('\n' + '='.repeat(60));
                console.log('\n📊 Final Results:');
                console.log(`   Total slides: ${totalSlides}`);
                console.log(`   Charts found: ${chartsFound}`);
                console.log(`   Chart ratio: ${totalSlides > 0 ? ((chartsFound / totalSlides) * 100).toFixed(1) : 0}%`);
                console.log(`   Expected: ~10-15% (1 in 10 slides)`);

                if (chartsFound > 0) {
                    const ratio = (chartsFound / totalSlides) * 100;
                    if (ratio >= 10 && ratio <= 20) {
                        console.log('\n✅ SUCCESS! Chart ratio is within expected range (10-20%)!');
                    } else if (ratio > 20) {
                        console.log('\n⚠️  WARNING: Chart ratio is higher than expected (>20%)');
                        console.log('   Consider adjusting shouldIncludeChart() logic');
                    } else {
                        console.log('\n⚠️  WARNING: Chart ratio is lower than expected (<10%)');
                    }

                    console.log('\n📋 Slides with charts:');
                    slidesWithCharts.forEach(({ index, topic }) => {
                        console.log(`   - Slide ${index + 1}: "${topic}"`);
                    });
                } else {
                    console.log('\n⚠️  WARNING: No charts found in generated slides');
                    console.log('   This might indicate an issue with chart generation logic');
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;

                let jsonStr = '';
                if (line.startsWith('data: ')) {
                    jsonStr = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    jsonStr = line.slice(5).trim();
                } else if (line.trim().startsWith('{')) {
                    jsonStr = line.trim();
                } else {
                    continue;
                }

                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                    const data = JSON.parse(jsonStr);

                    if (data.type === 'start') {
                        console.log(`🚀 Starting generation: ${data.total} slides\n`);
                    }
                    else if (data.type === 'slide' || data.type === 'slide_complete') {
                        totalSlides++;
                        const slideIndex = data.index ?? totalSlides - 1;
                        const topic = testData.outline[slideIndex] || `Slide ${slideIndex + 1}`;

                        const content = data.content || data.partial || '';
                        const hasChart = content.includes('<CHART') ||
                            content.includes('<chart') ||
                            content.toLowerCase().includes('charttype');

                        if (hasChart) {
                            chartsFound++;
                            slidesWithCharts.push({ index: slideIndex, topic });

                            console.log(`📊 Slide ${slideIndex + 1}: "${topic}" - ✅ CHART FOUND!`);

                            const chartTypeMatch = content.match(/charttype=["']([^"']+)["']/i);
                            if (chartTypeMatch) {
                                console.log(`   Chart type: ${chartTypeMatch[1]}`);
                            }

                            const valueMatches = content.match(/<VALUE>([^<]+)<\/VALUE>/g);
                            if (valueMatches && valueMatches.length > 0) {
                                const values = valueMatches.slice(0, 4).map(v => v.replace(/<\/?VALUE>/g, ''));
                                console.log(`   Sample data: ${values.join(', ')}`);
                            }
                        } else if (data.type === 'slide_complete') {
                            console.log(`✓  Slide ${slideIndex + 1}: "${topic}" - No chart`);
                        }
                    }
                    else if (data.type === 'done' || data.type === 'complete') {
                        console.log(`\n✅ Generation complete!`);
                    }
                    else if (data.type === 'token') {
                        // Check for charts in streaming partial content
                        const partial = data.partial || '';
                        if (partial.includes('<CHART') && !slidesWithCharts.find(s => s.index === data.index)) {
                            // Chart detected in streaming, will show on slide_complete
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON lines
                }
            }
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('\n❌ Request failed:', errorMessage);

        if (errorMessage.includes('ECONNREFUSED')) {
            console.error('\n💡 Make sure your Next.js dev server is running:');
            console.error('   npm run dev');
            console.error('   Server should be on: http://localhost:3000');
        }
    }
}

// Run test
testRoute();

