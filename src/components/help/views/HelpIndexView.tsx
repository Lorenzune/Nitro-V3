import { GetCfhStatusMessageComposer } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { FaArrowCircleRight } from 'react-icons/fa';
import { CreateLinkEvent, DispatchUiEvent, GetConfigurationValue, LocalizeText, ReportState, ReportType, SendMessageComposer } from '../../../api';
import { Button, Text } from '../../../common';
import { GuideToolEvent } from '../../../events';
import { useHelp } from '../../../hooks';
import helpDuck from '../../../assets/images/help/help-duck.png';

export const HelpIndexView: FC<{}> = props =>
{
    const { setActiveReport = null } = useHelp();

    const onReportClick = () =>
    {
        setActiveReport(prevValue =>
        {
            const currentStep = ReportState.SELECT_USER;
            const reportType = ReportType.BULLY;

            return { ...prevValue, currentStep, reportType };
        });
    };

    return (
        <div className="flex flex-col gap-2 py-1">
            <Text bold fontSize={ 3 }>{ LocalizeText('help.main.frame.title') }</Text>
            <Text center className="text-[#5c5c5c]">{ LocalizeText('help.main.frame.description') }</Text>
            <div className="flex justify-center py-1">
                <img src={ helpDuck } alt="" className="h-[105px] w-auto [image-rendering:pixelated]" />
            </div>
            <div className="flex flex-col gap-1.5">
                <Button variant="success" onClick={ onReportClick }>{ LocalizeText('help.main.bully.subtitle') }</Button>
                <Button variant="success" disabled={ !GetConfigurationValue('guides.enabled') } onClick={ () => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.CREATE_HELP_REQUEST)) }>{ LocalizeText('help.main.help.title') }</Button>
            </div>
            <div className="flex flex-col gap-1 pt-1">
                <button type="button" className="flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 text-left text-[0.78rem] font-bold text-[#2f2f2f] underline hover:brightness-110" onClick={ () => CreateLinkEvent('habbopages/help') }>
                    <FaArrowCircleRight className="text-[#46a01e] text-[0.95rem]" />
                    { LocalizeText('help.main.faq.link.text') }
                </button>
                <button type="button" className="flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 text-left text-[0.78rem] font-bold text-[#2f2f2f] underline hover:brightness-110" onClick={ () => SendMessageComposer(new GetCfhStatusMessageComposer(false)) }>
                    <FaArrowCircleRight className="text-[#46a01e] text-[0.95rem]" />
                    { LocalizeText('help.main.my.sanction.status') }
                </button>
                <button type="button" className="flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 text-left text-[0.78rem] font-bold text-[#2f2f2f] underline hover:brightness-110" onClick={ () => SendMessageComposer(new GetCfhStatusMessageComposer(true)) }>
                    <FaArrowCircleRight className="text-[#46a01e] text-[0.95rem]" />
                    { LocalizeText('help.main.my.reports.status') }
                </button>
            </div>
        </div>
    );
};
