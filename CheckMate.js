const { claimDetection } = require('./ClaimDetection');
const { factCheck, logFactChecks } = require('./GoogleFactCheck');


const main = async () => {
    const transcript = "The NHS is broken. Be honest with us. It'll take to fix it? As Janet knows and everyone knows, the NHS is still recovering from COVID. We went through the best part of two years where the NHS couldn't conduct all the treatments it normally would, and it is going to take time to recover from that. But we are now making progress. The waiting lists are coming down. But what Keir Starmer didn't mention to you, which you did Julie, is that they're now 7.5 million. He says they're coming down. And this guy says he's good at maths. Yeah, they are now coming down. They were at 7.2 million when you said you'd get them down, now they're 7.5 million. I'd like you to explain how they're coming down. Because they were coming down from where they were when they were higher on their way down. They are down, right? Yes, because the NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set. It's somebody else's fault. I'm really grateful for everyone in the NHS for working so hard and we have now settled pay rises with everyone in the NHS except for the junior doctors.";

    const claims = await claimDetection(transcript);
    // const claims = [
    //     {
    //       Claim: 'The NHS is still recovering from COVID.',
    //       Speaker: 'Unknown',
    //       Context: 'During a discussion about the current state of the NHS.'
    //     },
    //     {
    //       Claim: "We went through the best part of two years where the NHS couldn't conduct all the treatments it normally would.",
    //       Speaker: 'Unknown',
    //       Context: 'Explaining the impact of COVID on the NHS.'
    //     },
    //     {
    //       Claim: 'The waiting lists are coming down.',
    //       Speaker: 'Unknown',
    //       Context: 'Responding to a question about progress in the NHS.'
    //     },
    //     {
    //       Claim: "They're now 7.5 million [waiting lists].",
    //       Speaker: 'Unknown',
    //       Context: 'During the discussion about NHS waiting lists.'
    //     },
    //     {
    //       Claim: "They were at 7.2 million when you said you'd get them down, now they're 7.5 million.",
    //       Speaker: 'Unknown',
    //       Context: 'Pointing out the increase in NHS waiting lists.'
    //     },
    //     {
    //       Claim: "The NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set.",
    //       Speaker: 'Unknown',
    //       Context: 'Explaining the impact of industrial action on NHS appointments.'
    //     },
    //     {
    //       Claim: 'We have now settled pay rises with everyone in the NHS except for the junior doctors.',
    //       Speaker: 'Unknown',
    //       Context: 'Discussing the status of pay rise agreements in the NHS.'
    //     }
    //   ]

    if (claims === false) {
        console.log("Claim detection failed");
        return false;
    }

    console.log("\nClaims:");
    console.log(claims);

    const first_claim = claims[0]['Claim'];
    console.log("\nClaim to be processed:", first_claim);

    const fact_check = await factCheck(first_claim);
    logFactChecks(fact_check);
}

main();
