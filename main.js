const { CheckMate } = require('./CheckMate');
const { getAuth } = require('./helper/awsauth');
const credentials = require('./credentials.json');
const util = require('util');


const main = async () => {
    // Gather credentials
    const auth = await getAuth();

    const api_keys = {
        openai: auth.OPENAI_API_KEY,
        google: auth.GOOGLE_API_KEY,
        google_search_id: credentials.google_search_cx_id,
        google_client_id: credentials.google_oath_client_id,
        newscatcher: auth.NEWSCATCHER_API_KEY
    };

    // Input transcript (from AssemblyAI)
    const default_transcript = "The NHS is broken. Be honest with us. It'll take to fix it? As Janet knows and everyone knows, the NHS is still recovering from COVID. We went through the best part of two years where the NHS couldn't conduct all the treatments it normally would, and it is going to take time to recover from that. But we are now making progress. The waiting lists are coming down. But what Keir Starmer didn't mention to you, which you did Julie, is that they're now 7.5 million. He says they're coming down. And this guy says he's good at maths. Yeah, they are now coming down. They were at 7.2 million when you said you'd get them down, now they're 7.5 million. I'd like you to explain how they're coming down. Because they were coming down from where they were when they were higher on their way down. They are down, right? Yes, because the NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set. It's somebody else's fault. I'm really grateful for everyone in the NHS for working so hard and we have now settled pay rises with everyone in the NHS except for the junior doctors.";
    // const default_transcript = "This year alone, 10,000 people have crossed on boats. That's a record number. So again, he's made a promise and he's completely failed to keep it. Over the last 12 months, the number of crossings have down a third because the plans we've put in place are starting to make a difference. But the choice of this election is about the future. I believe you need to have a deterrent. The only way to stop this problem is to say to people who come here illegally, they cannot stay and they will be removed. If I'm your prime minister, the planes will go to Rwanda. We will have a deterrent. So the simple question for Stan is what will you do with people who come here illegally? Tell what will you do with them? What? What you do with them. That's what I'm gonna do. We'll have a deterrent. What are you gonna do? We need to smash the gangs that are running this file trade making a huge amount of money, putting some of the most vulnerable people in boats across the channel. They're making a fortune. Before I was a politician, Steven, I was the director of public prosecutions and I worked with the police and prosecuting other country countries to bring down terrorist gangs who are running across borders. I do not believe it's impossible to bring down these gangs. What I won't do is engage in a, an expensive gimmick. The Rwanda scheme, if he believed it was going to work, he wouldn't have called an election before. It can be tested. He wouldn't have done it. So Kier Starman said, smash the gangs. We put new laws in Parliament. Are you that have now led to almost a thousand criminals and people smugglers being arrested, serving hundreds of years in jail? 'cause we do need to smash the gangs. Kir Starer voted against those laws. So as ever, you say one thing here, but your track record says something completely different and you can't trust it to tackle immigration.";
    // const default_transcript = "Our southern border is a pipeline for vast quantities of illegal drugs, including meth, heroin, cocaine, and fentanyl. Every week, 300 of our citizens are killed by heroin alone, 90% of which floods across from our southern border. More Americans will die from drugs this year than were killed in the entire Vietnam war. In the last two years, ICE officers made 266,000 arrests of aliens with criminal records, including those charged or convicted of 100,000 assaults, 30,000 sex crimes, and 4,000 violent killings. Over the years, thousands of Americans have been brutally killed by those who illegally entered our country, and thousands more lives will be lost if we don't act right now. This is a humanitarian crisis, a crisis of the heart and a crisis of the soul.";
    // const default_transcript = "And we're going to win. Because for all the punditry last night, for all of that, our president made clear there is a contrast between someone who lies and some someone who leads. Let's start with the thing we have always known. Donald Trump is unburdened unburdened by the truth. It's not a burden he carries. Case in point, last night. He said the neo nazi rally in Charlottesville was fabricated. That's a lie. He insists incited at the United States Capitol on January 6 was only a small number of people who were, quote, ushered in in by the police. A lie. He claimed he never called our troops suckers and losers as general John Kelly General John Kelly, his former chief of staff, can tell. And earlier today, the president said himself it was not his best performance, but there are three things that were true yesterday before the debate that are still true today.";

    // Choose input type ["transcript" | "sentences"]
    const input_type = "transcript";
    // const input_type = "sentences";

    // Choose fact-check service ["Any" | "Google Fact Check" | "Search and Review" | "Fact Check Database"]
    // const service = "Any";
    // const service = "Google Fact Check";
    const service = "Search and review";

    // Run CheckMate claim detection & fact-checking process
    const results = await CheckMate(
        default_transcript,
        input_type,
        service,
        api_keys
    );

    console.log('\n', util.inspect(results, { showHidden: false, depth: null, colors: true }));
}


main();
